const request = require('supertest');

// We import a standalone test app so Jest doesn't need the real socket server
let app;
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.MONGO_URI  = process.env.MONGO_URI || 'mongodb://localhost:27017/bananaqueue_test';
  const express    = require('express');
  const cors       = require('cors');
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api/auth',    require('../routes/auth'));
  app.use('/api/queues',  require('../routes/queues'));
  app.use('/api/entries', require('../routes/entries'));
  app.use('/api/admin',   require('../routes/admin'));
});

describe('Auth API', () => {
  const testEmail = `test_${Date.now()}@test.com`;

  it('POST /api/auth/register → creates a new customer', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: testEmail, password: 'password123' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.role).toBe('customer');
  });

  it('POST /api/auth/login → returns token for valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('POST /api/auth/login → rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });
});
