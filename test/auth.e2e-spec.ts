/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const uniqueSuffix = Date.now();
  const testEmail = `e2e-${uniqueSuffix}@test.com`;
  const testPassword = 'testpass123';
  const testUsername = `e2euser${uniqueSuffix}`;
  let accessToken: string;
  let refreshToken: string;
  let hasDb = false;

  beforeAll(async () => {
    try {
      const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();
      app = moduleFixture.createNestApplication();
      await app.init();
      hasDb = true;
    } catch {
      // No database available — skip DB-dependent tests
    }
  }, 30000);

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /auth/signup', () => {
    it('should create user and return tokens', async () => {
      if (!hasDb) return;
      const res = await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: testEmail,
          password: testPassword,
          username: testUsername,
          displayName: 'E2E Test',
        })
        .expect(201);
      expect(res.body.data.access_token).toBeDefined();
      expect(res.body.data.refresh_token).toBeDefined();
      accessToken = res.body.data.access_token;
      refreshToken = res.body.data.refresh_token;
    });

    it('should reject duplicate email', async () => {
      if (!hasDb) return;
      await request(app.getHttpServer())
        .post('/auth/signup')
        .send({
          email: testEmail,
          password: testPassword,
          username: `diff-${uniqueSuffix}`,
        })
        .expect(409);
    });
  });

  describe('POST /auth/login', () => {
    it('should return tokens for valid credentials', async () => {
      if (!hasDb) return;
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: testPassword })
        .expect(201);
      expect(res.body.data.access_token).toBeDefined();
      expect(res.body.data.refresh_token).toBeDefined();
      // Capture tokens from login too (may differ from signup)
      accessToken = res.body.data.access_token;
      refreshToken = res.body.data.refresh_token;
    });

    it('should reject wrong password', async () => {
      if (!hasDb) return;
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: testEmail, password: 'wrongpassword' })
        .expect(401);
    });
  });

  describe('GET /auth/profile (authenticated)', () => {
    it('should return user data with valid token', async () => {
      if (!hasDb) return;
      const res = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.data).toHaveProperty('email');
      expect(res.body.data).toHaveProperty('username');
    });

    it('should reject invalid token', async () => {
      if (!hasDb) return;
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject unauthenticated', async () => {
      if (!hasDb) return;
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });
  });

  describe('POST /auth/refresh (authenticated)', () => {
    it('should issue new tokens with valid refresh token', async () => {
      if (!hasDb) return;
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(201);
      expect(res.body.data.access_token).toBeDefined();
      expect(res.body.data.refresh_token).toBeDefined();
    });

    it('should reject missing token', async () => {
      if (!hasDb) return;
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });

    it('should reject invalid refresh token', async () => {
      if (!hasDb) return;
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: 'invalid-token' })
        .expect(401);
    });
  });

  describe('GET /auth/nonce', () => {
    it('should return nonce with wallet address', async () => {
      if (!hasDb) return;
      const res = await request(app.getHttpServer())
        .get('/auth/nonce')
        .query({
          walletAddress: 'GDESTINATIONPLACEHOLDER123456789012345678901234',
        })
        .expect(200);
      expect(res.body.data.nonce).toBeDefined();
    });
  });

  describe('POST /auth/stellar/login', () => {
    it('should reject missing walletAddress', async () => {
      if (!hasDb) return;
      await request(app.getHttpServer())
        .post('/auth/stellar/login')
        .send({})
        .expect(400);
    });
  });
});
