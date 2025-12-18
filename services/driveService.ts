
import { Memory } from '../types';
import { getMemories, importMemories } from './storageService';

const CLIENT_ID_KEY = 'remindme_drive_client_id';
const FILENAME = 'remindme_memories.json';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

let tokenClient: any;
let gapiInited = false;
let gisInited = false;

export const getStoredClientId = (): string => {
  return localStorage.getItem(CLIENT_ID_KEY) || '';
};

export const setStoredClientId = (id: string) => {
  localStorage.setItem(CLIENT_ID_KEY, id.trim());
};

export const initDrive = async (clientId: string): Promise<void> => {
  if (!clientId) return;

  return new Promise((resolve) => {
    // Load GAPI
    window.gapi.load('client', async () => {
      await window.gapi.client.init({
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
      });
      gapiInited = true;
      checkInit(resolve);
    });

    // Load GIS
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: '', // defined at request time
    });
    gisInited = true;
    checkInit(resolve);
  });
};

const checkInit = (resolve: () => void) => {
  if (gapiInited && gisInited) resolve();
};

const getToken = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        reject(resp);
      }
      resolve(resp);
    };
    // Force prompt if no token or expired?
    // For simplicity, we just request. GIS handles session.
    tokenClient.requestAccessToken({ prompt: '' });
  });
};

const findFile = async (): Promise<string | null> => {
  try {
    const response = await window.gapi.client.drive.files.list({
      q: `name = '${FILENAME}' and trashed = false`,
      fields: 'files(id, name)',
      spaces: 'drive',
    });
    const files = response.result.files;
    if (files && files.length > 0) {
      return files[0].id;
    }
    return null;
  } catch (e) {
    console.error('Error finding file', e);
    return null;
  }
};

const createFile = async (content: string): Promise<string> => {
  const fileContent = new Blob([content], { type: 'application/json' });
  const metadata = {
    name: FILENAME,
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', fileContent);

  const accessToken = window.gapi.client.getToken().access_token;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
    body: form,
  });
  const data = await response.json();
  return data.id;
};

const updateFile = async (fileId: string, content: string): Promise<void> => {
  const fileContent = new Blob([content], { type: 'application/json' });
  const metadata = {
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', fileContent);

  const accessToken = window.gapi.client.getToken().access_token;

  await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`, {
    method: 'PATCH',
    headers: new Headers({ 'Authorization': 'Bearer ' + accessToken }),
    body: form,
  });
};

// -- Public Methods --

export const connectAndSync = async (): Promise<string> => {
    try {
        await getToken();
        return "Connected";
    } catch (e) {
        console.error(e);
        throw new Error("Failed to connect");
    }
}

export const uploadMemoriesToDrive = async (): Promise<void> => {
    // Ensure we have a token (might need to handle expiration in real app, simply requesting here)
    if (!window.gapi?.client?.getToken()) {
        await getToken();
    }

    const memories = getMemories();
    const content = JSON.stringify(memories, null, 2);
    
    let fileId = await findFile();
    if (fileId) {
        await updateFile(fileId, content);
    } else {
        await createFile(content);
    }
};

export const downloadMemoriesFromDrive = async (): Promise<void> => {
     if (!window.gapi?.client?.getToken()) {
        await getToken();
    }

    const fileId = await findFile();
    if (!fileId) throw new Error("No backup found in Drive");

    const response = await window.gapi.client.drive.files.get({
        fileId: fileId,
        alt: 'media',
    });

    // gapi returns body in result for media download usually, or we parse result
    const remoteMemories = response.result || response.body; 
    
    // Safety check
    if (Array.isArray(remoteMemories)) {
        importMemories(remoteMemories as Memory[]);
    } else if (typeof remoteMemories === 'string') {
        importMemories(JSON.parse(remoteMemories));
    } else {
        // sometimes gapi parses it automatically
         importMemories(remoteMemories as unknown as Memory[]);
    }
};
