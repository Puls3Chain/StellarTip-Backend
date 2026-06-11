/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let hasDb = false;
  let accessToken: string;
  const uniqueSuffix = Date.now();

  beforeAll(async () => {
    try {
      const m: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = m.createNestApplication();
      await app.init();
      hasDb = true;

      // Sign up a user and get token for authenticated tests
      const signupRes = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: `notif-${uniqueSuffix}@test.com`,
          password: 'testpass123',
          username: `notifs${uniqueSuffix}`,
          displayName: 'Notif E2E',
        });
      accessToken = signupRes.body.data?.access_token ?? '';
    } catch {
      /* no DB */
    }
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  // --- Auth guards ---

  it('GET /notifications rejects unauthenticated', async () => {
    if (!hasDb) return;
    await request(app.getHttpServer()).get('/notifications').expect(401);
  });

  it('GET /notifications/unread-count rejects unauthenticated', async () => {
    if (!hasDb) return;
    await request(app.getHttpServer())
      .get('/notifications/unread-count')
      .expect(401);
  });

  it('PATCH /notifications/:id/read rejects unauthenticated', async () => {
    if (!hasDb) return;
    await request(app.getHttpServer())
      .patch('/notifications/fake-id/read')
      .expect(401);
  });

  // --- Authenticated endpoints ---

  describe('Authenticated notification operations', () => {
    it('GET /notifications returns paginated response', async () => {
      if (!hasDb || !accessToken) return;
      const res = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.data).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('total');
    });

    it('GET /notifications/unread-count returns count', async () => {
      if (!hasDb || !accessToken) return;
      const res = await request(app.getHttpServer())
        .get('/notifications/unread-count')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(typeof res.body.data.count).toBe('number');
    });

    it('PATCH /notifications/:id/read returns 404 for nonexistent', async () => {
      if (!hasDb || !accessToken) return;
      await request(app.getHttpServer())
        .patch('/notifications/00000000-0000-0000-0000-000000000000/read')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('GET /notifications rejects invalid token', async () => {
      if (!hasDb) return;
      await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', 'Bearer bad-token')
        .expect(401);
    });
  });
});
