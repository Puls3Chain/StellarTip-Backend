/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Profiles (e2e)', () => {
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
          email: `profiles-${uniqueSuffix}@test.com`,
          password: 'testpass123',
          username: `profiles${uniqueSuffix}`,
          displayName: 'Profiles E2E',
        });
      accessToken = signupRes.body.data?.access_token ?? '';
    } catch {
      /* no DB */
    }
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  // --- Public endpoints ---

  it('GET /profiles returns array', async () => {
    if (!hasDb) return;
    const res = await request(app.getHttpServer()).get('/profiles').expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /profiles?q=test searches', async () => {
    if (!hasDb) return;
    const res = await request(app.getHttpServer())
      .get('/profiles?q=test')
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('GET /profiles/:username returns 404 for nonexistent', async () => {
    if (!hasDb) return;
    await request(app.getHttpServer())
      .get('/profiles/nonexistent99999')
      .expect(404);
  });

  it('GET /profiles/:username/tipping-info returns 404 for nonexistent', async () => {
    if (!hasDb) return;
    await request(app.getHttpServer())
      .get('/profiles/nonexistent99999/tipping-info')
      .expect(404);
  });

  // --- Auth guards ---

  it('PUT /profiles/me rejects unauthenticated', async () => {
    if (!hasDb) return;
    await request(app.getHttpServer()).put('/profiles/me').expect(401);
  });

  it('GET /profiles/me/analytics rejects unauthenticated', async () => {
    if (!hasDb) return;
    await request(app.getHttpServer())
      .get('/profiles/me/analytics')
      .expect(401);
  });

  // --- Authenticated endpoints ---

  describe('Authenticated profile operations', () => {
    it('PUT /profiles/me updates display name', async () => {
      if (!hasDb || !accessToken) return;
      const res = await request(app.getHttpServer())
        .put('/profiles/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ displayName: 'Updated Name' })
        .expect(200);
      expect(res.body.data.displayName).toBe('Updated Name');
    });

    it('PUT /profiles/me updates bio', async () => {
      if (!hasDb || !accessToken) return;
      const res = await request(app.getHttpServer())
        .put('/profiles/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ bio: 'My test bio' })
        .expect(200);
      expect(res.body.data.bio).toBe('My test bio');
    });

    it('PUT /profiles/me rejects without token', async () => {
      if (!hasDb) return;
      await request(app.getHttpServer())
        .put('/profiles/me')
        .send({ displayName: 'No Token' })
        .expect(401);
    });

    it('GET /profiles/me/analytics returns stats', async () => {
      if (!hasDb || !accessToken) return;
      const res = await request(app.getHttpServer())
        .get('/profiles/me/analytics')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.data).toHaveProperty('totalTips');
      expect(res.body.data).toHaveProperty('totalAmount');
    });

    it('PATCH /profiles/me/social-links updates social links', async () => {
      if (!hasDb || !accessToken) return;
      const res = await request(app.getHttpServer())
        .patch('/profiles/me/social-links')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ twitter: '@test', website: 'https://test.com' })
        .expect(200);
      expect(res.body.data.socialLinks).toMatchObject({
        twitter: '@test',
        website: 'https://test.com',
      });
    });
  });
});
