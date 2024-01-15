import admin from 'firebase-admin';

export const initializeFirebase = () => {
  const serviceAccountCreds: {
    private_key: string;
    client_email: string;
    project_id: string;
  } = JSON.parse(process.env.serviceAccount);
  admin.initializeApp({
    credential: admin.credential.cert({
      clientEmail: serviceAccountCreds.client_email,
      privateKey: serviceAccountCreds.private_key,
      projectId: serviceAccountCreds.project_id,
    }),
  });
};
