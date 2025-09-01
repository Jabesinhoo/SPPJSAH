const request = require('supertest');
const app = require('../app'); // asegúrate de exportar `app` desde app.js
const { sequelize } = require('../models'); // 👈 importa sequelize

describe('Auth API', () => {
  let server;

  beforeAll(() => {
    server = app.listen(4000); // levanta en otro puerto para test
  });

  afterAll(async () => {
  await server.close();
  await sequelize.close(); // 👈 cierra la conexión de Sequelize
});


  test('Registro exitoso', async () => {
  const uniqueUser = 'testuser_' + Date.now();

  const res = await request(server)
    .post('/api/register')
    .send({ username: uniqueUser, password: 'Test1234' });

  expect(res.statusCode).toBe(201);
  expect(res.body).toHaveProperty('user');
  expect(res.body.user).toHaveProperty('username', uniqueUser);
});


  test('Registro falla con usuario inválido', async () => {
    const res = await request(server)
      .post('/api/register')
      .send({ username: 'a', password: '123' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  test('Login exitoso', async () => {
    const res = await request(server)
      .post('/api/login')
      .send({ username: 'testuser', password: 'Test1234' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user).toHaveProperty('username', 'testuser');
  });

  test('Login falla con credenciales inválidas', async () => {
    const res = await request(server)
      .post('/api/login')
      .send({ username: 'wrong', password: 'wrong' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
