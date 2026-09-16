import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import { AppConfig, Registration, ResultItem } from '../types';

export const CONFIG_DOC = 'config/main';
export const REGISTRATIONS_COL = 'registrations';
export const RESULTS_COL = 'results';

export async function subscribeToResults(callback: (results: ResultItem[]) => void) {
  try {
    return onSnapshot(collection(db, RESULTS_COL), (snapshot) => {
      const res = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResultItem));
      callback(res);
    }, (error) => {
      console.warn("Erro no snapshot de resultados:", error);
      callback([]);
    });
  } catch (err) {
    console.warn("Erro ao iniciar escuta de resultados:", err);
    callback([]);
    return () => {};
  }
}

export async function importResults(results: Omit<ResultItem, 'id'>[]): Promise<{ success: boolean; message: string }> {
  try {
    const addPromises = results.map(item => {
      return addDoc(collection(db, RESULTS_COL), {
        ...item,
        createdAt: Date.now()
      });
    });
    await Promise.all(addPromises);
    return { success: true, message: `${results.length} resultados importados com sucesso.` };
  } catch (error: any) {
    console.error("Error importing results: ", error);
    return { success: false, message: "Erro ao importar resultados." };
  }
}

export async function clearAllResults(): Promise<{ success: boolean; message: string }> {
  try {
    const snapshot = await getDocs(collection(db, RESULTS_COL));
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    return { success: true, message: "Todos os resultados foram apagados." };
  } catch (error: any) {
    console.error("Error clearing results: ", error);
    return { success: false, message: "Erro ao apagar resultados." };
  }
}


export async function clearAllRegistrations(): Promise<{ success: boolean; message: string }> {
  try {
    const snapshot = await getDocs(collection(db, REGISTRATIONS_COL));
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    return { success: true, message: "Todos os cadastros foram apagados." };
  } catch (error: any) {
    console.error("Error clearing registrations: ", error);
    return { success: false, message: "Erro ao apagar cadastros." };
  }
}

export async function importRegistrations(registrations: Omit<Registration, 'id' | 'createdAt'>[]): Promise<{ success: boolean; message: string }> {
  try {
    const addPromises = registrations.map(reg => {
      return addDoc(collection(db, REGISTRATIONS_COL), {
        ...reg,
        isAdmin: false,
        createdAt: Date.now()
      });
    });
    await Promise.all(addPromises);
    return { success: true, message: `${registrations.length} cadastros importados com sucesso.` };
  } catch (error: any) {
    console.error("Error importing registrations: ", error);
    return { success: false, message: "Erro ao importar cadastros." };
  }
}

export const DEFAULT_CONFIG: AppConfig = {
  tshirtSizes: { P: 10, M: 20, G: 20, GG: 10, XG: 5 },
  maxRegistrations: 100,
  isAutoMax: true,
  isActive: true,
  topBannerUrl: "",
  topBannerEnabled: true,
  topBannerScale: 100,
  topBannerPosition: 'center',
  kits: [
    { name: "Kit Simples", imageUrl: "" },
    { name: "Kit Premium", imageUrl: "" }
  ],
  genders: ["Masculino", "Feminino"],
  modalities: ["3Km (Caminhada)", "5Km", "10Km"],
  enablePCD: false,
  showHeader: true,
  pageTitle: "Meu Evento",
  pageTitleColor: "#171717",
  pageSubtitle: "",
  pageSubtitleColor: "#525252",
  pageTitleSize: "grande",
  pageSubtitleSize: "medio",
  pageTitleBold: true,
  pageTitleItalic: false,
  pageSubtitleBold: false,
  pageSubtitleItalic: false,
  allowAdminRegistration: true
};

export async function initConfig() {
  try {
    const ref = doc(db, CONFIG_DOC);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      await setDoc(ref, DEFAULT_CONFIG);
    }
  } catch (error) {
    console.warn("Erro ao inicializar configurações no Firestore:", error);
  }
}

export async function getConfig(): Promise<AppConfig> {
  try {
    const ref = doc(db, CONFIG_DOC);
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      return snapshot.data() as AppConfig;
    }
  } catch (error) {
    console.warn("Erro ao buscar configurações:", error);
  }
  return DEFAULT_CONFIG;
}

export async function updateConfig(config: AppConfig) {
  const ref = doc(db, CONFIG_DOC);
  await setDoc(ref, config);
}

export function subscribeToConfig(callback: (config: AppConfig) => void) {
  try {
    return onSnapshot(doc(db, CONFIG_DOC), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as AppConfig);
      } else {
        callback(DEFAULT_CONFIG);
      }
    }, (error) => {
      console.warn("Erro ao escutar configurações no Firestore:", error);
      callback(DEFAULT_CONFIG);
    });
  } catch (err) {
    console.warn("Erro ao iniciar escuta de configurações:", err);
    callback(DEFAULT_CONFIG);
    return () => {};
  }
}

export function subscribeToRegistrations(callback: (regs: Registration[]) => void) {
  try {
    return onSnapshot(collection(db, REGISTRATIONS_COL), (snapshot) => {
      const regs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
      callback(regs);
    }, (error) => {
      console.warn("Erro ao escutar cadastros no Firestore:", error);
      callback([]);
    });
  } catch (err) {
    console.warn("Erro ao iniciar escuta de cadastros:", err);
    callback([]);
    return () => {};
  }
}

export async function getRegistrationByCpf(cpf: string): Promise<Registration | null> {
  const q = query(collection(db, REGISTRATIONS_COL), where("cpf", "==", cpf));
  const snapshot = await getDocs(q);
  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Registration;
  }
  return null;
}

export async function submitRegistration(data: Omit<Registration, 'isAdmin' | 'createdAt' | 'id'> & { id?: string }): Promise<{ success: boolean; message: string }> {
  try {
    const config = await getConfig();
    if (!config.isActive) {
      return { success: false, message: "Os cadastros estão desativados." };
    }

    const snapshot = await getDocs(collection(db, REGISTRATIONS_COL));
    const allRegs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
    
    let maxAllowed = config.maxRegistrations;
    if (config.isAutoMax) {
      maxAllowed = Object.values(config.tshirtSizes).reduce((a: number, b: number) => a + b, 0);
    }

    const existingReg = data.id ? allRegs.find(r => r.id === data.id) : allRegs.find(r => r.cpf === data.cpf);
    const isUpdate = !!existingReg;

    if (!isUpdate && allRegs.length >= maxAllowed) {
      return { success: false, message: "Vagas esgotadas!" };
    }

    if (config.isAutoMax && data.kit !== 'Nenhum' && data.tshirtSize) {
      // If updating, don't count their own existing registration in the size limit
      const currentSizeCount = allRegs.filter(r => r.tshirtSize === data.tshirtSize && r.id !== (existingReg?.id)).length;
      const allowedSizeCount = config.tshirtSizes[data.tshirtSize] || 0;
      if (currentSizeCount >= allowedSizeCount) {
        return { success: false, message: `Tamanho ${data.tshirtSize} esgotado. Escolha outro tamanho.` };
      }
    }

    if (isUpdate && existingReg) {
      const ref = doc(db, REGISTRATIONS_COL, existingReg.id as string);
      await setDoc(ref, {
        ...data,
        isAdmin: existingReg.isAdmin,
        createdAt: existingReg.createdAt
      }, { merge: true });
      return { success: true, message: "Cadastro atualizado com sucesso!" };
    } else {
      const isAdmin = allRegs.length === 0;
      await addDoc(collection(db, REGISTRATIONS_COL), {
        ...data,
        isAdmin,
        createdAt: Date.now()
      });
      return { success: true, message: "Cadastro realizado com sucesso!" };
    }
  } catch (error: any) {
    console.error("Error adding document: ", error);
    return { success: false, message: "Erro ao realizar cadastro. Tente novamente." };
  }
}

export async function deleteRegistration(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const ref = doc(db, REGISTRATIONS_COL, id);
    await deleteDoc(ref);
    return { success: true, message: "Cadastro excluído com sucesso." };
  } catch (error: any) {
    console.error("Error deleting registration: ", error);
    return { success: false, message: "Erro ao excluir cadastro." };
  }
}
