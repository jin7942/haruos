import { Test, TestingModule } from '@nestjs/testing';
import { NasWatcherService } from './nas-watcher.service';
import { NasOrganizerService } from './nas-organizer.service';

describe('NasWatcherService', () => {
  let service: NasWatcherService;
  let organizer: jest.Mocked<NasOrganizerService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NasWatcherService,
        {
          provide: NasOrganizerService,
          useValue: {
            organizeFiles: jest.fn().mockResolvedValue({
              organized: 0,
              skipped: 0,
              extracted: 0,
              errors: [],
            }),
          },
        },
      ],
    }).compile();

    service = module.get(NasWatcherService);
    organizer = module.get(NasOrganizerService);
  });

  afterEach(() => {
    service.stop();
  });

  it('시작 전에는 비활성 상태이다', () => {
    expect(service.isActive()).toBe(false);
  });

  it('start() 후 활성 상태가 된다', () => {
    service.start();

    expect(service.isActive()).toBe(true);
  });

  it('stop() 후 비활성 상태가 된다', () => {
    service.start();
    service.stop();

    expect(service.isActive()).toBe(false);
  });

  it('중복 start() 호출 시 경고만 하고 에러 없다', () => {
    service.start();
    service.start(); // 두 번째 호출은 경고만

    expect(service.isActive()).toBe(true);
  });

  it('poll()이 organizer를 호출한다', async () => {
    await service.poll();

    expect(organizer.organizeFiles).toHaveBeenCalled();
  });

  it('poll() 중복 실행을 방지한다', async () => {
    // organizeFiles를 느리게 만듦
    let resolveOrganize: () => void;
    organizer.organizeFiles.mockReturnValue(
      new Promise<any>((resolve) => {
        resolveOrganize = () => resolve({ organized: 0, skipped: 0, extracted: 0, errors: [] });
      }),
    );

    const firstPoll = service.poll();
    await service.poll(); // 이전 실행 중이므로 스킵

    resolveOrganize!();
    await firstPoll;

    expect(organizer.organizeFiles).toHaveBeenCalledTimes(1);
  });
});
