const request = require('supertest');

let app, adminToken, customerToken;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.MONGO_URI  = process.env.MONGO_URI || 'mongodb://localhost:27017/bananaqueue_test';
  const express = require('express');
  app = express();
  app.use(require('cors')());
  app.use(express.json());
  app.use('/api/auth',    require('../routes/auth'));
  app.use('/api/queues',  require('../routes/queues'));
  app.use('/api/entries', require('../routes/entries'));
  app.use('/api/admin',   require('../routes/admin'));

  // Register and login customer
  const cEmail = `cust_${Date.now()}@test.com`;
  const cRes = await request(app).post('/api/auth/register')
    .send({ name: 'Cust', email: cEmail, password: 'pass123' });
  customerToken = cRes.body.token;
});

describe('Queue API', () => {
  it('GET /api/queues → returns array (public authenticated)', async () => {
    const res = await request(app)
      .get('/api/queues')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/entries/join → rejects if queueId is missing', async () => {
    const res = await request(app)
      .post('/api/entries/join')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/queueId/i);
  });

  it('GET /api/entries/my/history → returns array for customer', async () => {
    const res = await request(app)
      .get('/api/entries/my/history')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
