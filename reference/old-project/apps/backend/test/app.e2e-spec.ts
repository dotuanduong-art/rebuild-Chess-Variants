import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AddressInfo } from 'node:net';
import { io, Socket } from 'socket.io-client';
import { AppModule } from './../src/app.module';
import {
  accessToken,
  accountId,
  sessionId,
  type AuthProvider,
} from '../src/auth/auth.contract';
import { AUTH_PROVIDER } from '../src/auth/auth.tokens';

describe('Application smoke (e2e)', () => {
  let app: INestApplication;
  let client: Socket | undefined;

  beforeAll(async () => {
    const authProvider: AuthProvider = {
      authenticate: jest.fn().mockResolvedValue({
        accountId: accountId('e2e_account'),
        sessionId: sessionId('e2e_session'),
      }),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AUTH_PROVIDER)
      .useValue(authProvider)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.listen(0, '127.0.0.1');
  });

  it('starts the app and accepts a Socket.IO connection', async () => {
    const address = app.getHttpServer().address() as AddressInfo;
    client = io(`http://127.0.0.1:${address.port}`, {
      forceNew: true,
      reconnection: false,
      transports: ['websocket'],
      auth: { accessToken: accessToken('e2e_access') },
    });

    await new Promise<void>((resolve, reject) => {
      client?.once('authenticated', resolve);
      client?.once('connect_error', reject);
    });

    expect(client.connected).toBe(true);
  });

  afterAll(async () => {
    client?.disconnect();
    await app.close();
  });
});
