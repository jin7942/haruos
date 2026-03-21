import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CodeGroupEntity } from './entities/code-group.entity';
import { CodeEntity } from './entities/code.entity';
import { CreateCodeGroupRequestDto } from './dto/create-code-group.request.dto';
import { CreateCodeRequestDto } from './dto/create-code.request.dto';
import { CodeGroupResponseDto } from './dto/code-group.response.dto';
import { CodeResponseDto } from './dto/code.response.dto';
import {
  ResourceNotFoundException,
  DuplicateResourceException,
} from '../../common/exceptions/business.exception';

const CACHE_TTL = 1800000; // 30분
const CACHE_KEY_ALL_GROUPS = 'common-code:groups';
const CACHE_KEY_GROUP_PREFIX = 'common-code:group:';

@Injectable()
export class CommonCodeService {
  private readonly logger = new Logger(CommonCodeService.name);

  constructor(
    @InjectRepository(CodeGroupEntity)
    private readonly groupRepository: Repository<CodeGroupEntity>,
    @InjectRepository(CodeEntity)
    private readonly codeRepository: Repository<CodeEntity>,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  /**
   * 모든 코드 그룹을 조회한다. (캐시 적용)
   *
   * @returns 코드 그룹 목록
   */
  async findAllGroups(): Promise<CodeGroupResponseDto[]> {
    const cached = await this.cacheManager.get<CodeGroupResponseDto[]>(CACHE_KEY_ALL_GROUPS);
    if (cached) return cached;

    const groups = await this.groupRepository.find({ order: { groupCode: 'ASC' } });
    const result = groups.map((g) => CodeGroupResponseDto.from(g));

    await this.cacheManager.set(CACHE_KEY_ALL_GROUPS, result, CACHE_TTL);
    return result;
  }

  /**
   * 특정 코드 그룹과 하위 코드 목록을 조회한다. (캐시 적용)
   *
   * @param groupCode - 코드 그룹 코드
   * @returns 코드 그룹 + 하위 코드 목록
   * @throws ResourceNotFoundException 그룹이 존재하지 않는 경우
   */
  async findGroupByCode(groupCode: string): Promise<CodeGroupResponseDto> {
    const cacheKey = CACHE_KEY_GROUP_PREFIX + groupCode;
    const cached = await this.cacheManager.get<CodeGroupResponseDto>(cacheKey);
    if (cached) return cached;

    const group = await this.groupRepository.findOne({ where: { groupCode } });
    if (!group) {
      throw new ResourceNotFoundException('CodeGroup', groupCode);
    }

    const codes = await this.codeRepository.find({
      where: { groupCode },
      order: { sortOrder: 'ASC' },
    });

    const result = CodeGroupResponseDto.from(group, codes.map(CodeResponseDto.from));
    await this.cacheManager.set(cacheKey, result, CACHE_TTL);
    return result;
  }

  /**
   * 특정 그룹의 코드 목록을 조회한다. (캐시 적용)
   *
   * @param groupCode - 코드 그룹 코드
   * @returns 코드 목록
   */
  async findCodesByGroup(groupCode: string): Promise<CodeResponseDto[]> {
    const group = await this.findGroupByCode(groupCode);
    return group.codes || [];
  }

  /**
   * 코드 그룹을 생성한다.
   *
   * @param dto - 그룹 코드, 이름, 설명
   * @returns 생성된 코드 그룹
   * @throws DuplicateResourceException 그룹 코드가 이미 존재하는 경우
   */
  async createGroup(dto: CreateCodeGroupRequestDto): Promise<CodeGroupResponseDto> {
    const existing = await this.groupRepository.findOne({ where: { groupCode: dto.groupCode } });
    if (existing) {
      throw new DuplicateResourceException('CodeGroup', dto.groupCode);
    }

    const group = this.groupRepository.create({
      groupCode: dto.groupCode,
      name: dto.name,
      description: dto.description || null,
    });
    await this.groupRepository.save(group);

    await this.invalidateCache();
    return CodeGroupResponseDto.from(group);
  }

  /**
   * 코드를 생성한다.
   *
   * @param dto - 그룹 코드, 코드값, 이름, 정렬, 활성, 메타데이터
   * @returns 생성된 코드
   * @throws ResourceNotFoundException 그룹이 존재하지 않는 경우
   * @throws DuplicateResourceException 동일 그룹 내 코드가 이미 존재하는 경우
   */
  async createCode(dto: CreateCodeRequestDto): Promise<CodeResponseDto> {
    const group = await this.groupRepository.findOne({ where: { groupCode: dto.groupCode } });
    if (!group) {
      throw new ResourceNotFoundException('CodeGroup', dto.groupCode);
    }

    const existing = await this.codeRepository.findOne({
      where: { groupCode: dto.groupCode, code: dto.code },
    });
    if (existing) {
      throw new DuplicateResourceException('Code', `${dto.groupCode}:${dto.code}`);
    }

    const code = this.codeRepository.create({
      groupCode: dto.groupCode,
      code: dto.code,
      name: dto.name,
      sortOrder: dto.sortOrder ?? 0,
      isEnabled: dto.isEnabled ?? true,
      metadata: dto.metadata || null,
    });
    await this.codeRepository.save(code);

    await this.invalidateCache(dto.groupCode);
    return CodeResponseDto.from(code);
  }

  /**
   * 코드값이 유효한지 검증한다. 캐시된 코드 목록에서 확인.
   *
   * @param groupCode - 코드 그룹 코드
   * @param code - 검증할 코드값
   * @returns 유효 여부
   */
  async validateCode(groupCode: string, code: string): Promise<boolean> {
    try {
      const codes = await this.findCodesByGroup(groupCode);
      return codes.some((c) => c.code === code && c.isEnabled);
    } catch {
      return false;
    }
  }

  /** 캐시 무효화. groupCode 지정 시 해당 그룹만, 미지정 시 전체. */
  private async invalidateCache(groupCode?: string): Promise<void> {
    await this.cacheManager.del(CACHE_KEY_ALL_GROUPS);
    if (groupCode) {
      await this.cacheManager.del(CACHE_KEY_GROUP_PREFIX + groupCode);
    }
    this.logger.log(`Cache invalidated${groupCode ? `: ${groupCode}` : ': all'}`);
  }
}
