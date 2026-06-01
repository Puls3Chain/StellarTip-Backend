import { AuthThrottle, TipCreationThrottle, SkipApiThrottle } from './throttle.config';

describe('ThrottleConfig', () => {
  describe('AuthThrottle', () => {
    it('should apply throttle decorator', () => {
      const decorator = AuthThrottle();
      expect(decorator).toBeDefined();
    });
  });

  describe('TipCreationThrottle', () => {
    it('should apply throttle decorator', () => {
      const decorator = TipCreationThrottle();
      expect(decorator).toBeDefined();
    });
  });

  describe('SkipApiThrottle', () => {
    it('should apply skip throttle decorator', () => {
      const decorator = SkipApiThrottle();
      expect(decorator).toBeDefined();
    });
  });
});
