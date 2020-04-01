import { TestBed, inject } from '@angular/core/testing';

import { BrowserCacheTtlService } from './browser-cache-ttl.service';

describe('BrowserCacheTtlService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BrowserCacheTtlService]
    });
  });

  it('should be created', inject([BrowserCacheTtlService], (service: BrowserCacheTtlService) => {
    expect(service).toBeTruthy();
  }));
  it('should return apiCacheTtl when browserCacheTtl get method is called', inject([BrowserCacheTtlService],
     (service: BrowserCacheTtlService) => {
      document.getElementById = jasmine.createSpy().and.returnValue('600');
      expect(service.browserCacheTtl).toBeDefined();
  }));
});
