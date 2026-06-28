import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const rootDir = process.cwd();
const firebaseConfigPath = path.join(rootDir, 'public/firebase-config.js');
const firebaseToolsPath = path.join(process.env.HOME, '.config/configstore/firebase-tools.json');

const users = [
  {
    name: 'Platform Owner',
    email: 'owner@webcreator.dev',
    password: 'Owner123!',
    role: 'superadmin'
  },
  {
    name: 'Studio Admin',
    email: 'admin@webcreator.dev',
    password: 'Admin123!',
    role: 'admin'
  },
  {
    name: 'Content Moderator',
    email: 'moderator@webcreator.dev',
    password: 'Mod123!',
    role: 'moderator'
  },
  {
    name: 'Read Only Visitor',
    email: 'visitor@webcreator.dev',
    password: 'Visitor123!',
    role: 'visitor'
  }
];

const runtimeConfig = readRuntimeConfig();
const projectId = runtimeConfig.firebaseProjectId || runtimeConfig.firebase?.projectId;
const apiKey = runtimeConfig.firebase?.apiKey;
const accessToken = readFirebaseCliAccessToken();

if (!projectId || !apiKey) {
  throw new Error('public/firebase-config.js icinde projectId/apiKey bulunamadi.');
}

await enableService('identitytoolkit.googleapis.com');
await enableService('firestore.googleapis.com');

for (const user of users) {
  const firebaseUser = await createOrSignInUser(user.email, user.password);
  await writePlatformUser(firebaseUser.localId, user);
  console.log(`${user.email} -> ${user.role} hazir`);
}

console.log('Firebase bootstrap tamamlandi.');

function readRuntimeConfig() {
  if (!fs.existsSync(firebaseConfigPath)) {
    throw new Error('public/firebase-config.js bulunamadi. Once public/firebase-config.example.js dosyasindan olusturun.');
  }

  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(firebaseConfigPath, 'utf8'), sandbox, { filename: firebaseConfigPath });
  return sandbox.window.webCreatorFirebaseConfig;
}

function readFirebaseCliAccessToken() {
  if (!fs.existsSync(firebaseToolsPath)) {
    throw new Error('Firebase CLI oturumu bulunamadi. Once firebase login calistirin.');
  }

  const firebaseTools = JSON.parse(fs.readFileSync(firebaseToolsPath, 'utf8'));
  const token = firebaseTools.tokens?.access_token;
  if (!token) {
    throw new Error('Firebase CLI access token bulunamadi. Once firebase login calistirin.');
  }

  return token;
}

async function enableService(serviceName) {
  const response = await fetchWithRetry(
    `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${serviceName}:enable`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: '{}'
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${serviceName} etkinlestirilemedi: ${body}`);
  }
}

async function createOrSignInUser(email, password) {
  const signUp = await authRequest('accounts:signUp', {
    email,
    password,
    returnSecureToken: true
  });

  if (signUp.ok) {
    return signUp.body;
  }

  if (signUp.message === 'EMAIL_EXISTS') {
    const signIn = await authRequest('accounts:signInWithPassword', {
      email,
      password,
      returnSecureToken: true
    });

    if (signIn.ok) {
      return signIn.body;
    }

    throw new Error(`${email} girisi dogrulanamadi: ${signIn.message}`);
  }

  if (signUp.message === 'CONFIGURATION_NOT_FOUND' || signUp.message === 'OPERATION_NOT_ALLOWED') {
    throw new Error(
      'Firebase Authentication henuz initialize edilmemis veya Email/Password provider kapali. ' +
        'Firebase Console > Authentication > Sign-in method ekranindan Email/Password ve Anonymous providerlarini etkinlestirin.'
    );
  }

  throw new Error(`${email} olusturulamadi: ${signUp.message}`);
}

async function authRequest(method, payload) {
  const response = await fetchWithRetry(`https://identitytoolkit.googleapis.com/v1/${method}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const body = await response.json();

  return {
    ok: response.ok,
    body,
    message: body.error?.message
  };
}

async function writePlatformUser(uid, user) {
  const response = await fetchWithRetry(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/platformUsers/${uid}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: toFirestoreFields({
          id: uid,
          name: user.name,
          email: user.email,
          password: '',
          role: user.role
        })
      })
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${user.email} rol dokumani yazilamadi: ${body}`);
  }
}

function toFirestoreFields(value) {
  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [
      key,
      typeof fieldValue === 'boolean' ? { booleanValue: fieldValue } : { stringValue: String(fieldValue ?? '') }
    ])
  );
}

async function fetchWithRetry(url, options, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fetch(url, options);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 1200));
    }
  }

  throw lastError;
}
