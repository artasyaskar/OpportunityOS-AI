export interface PaymentMerchantConfig {
  providerId: string;
  name: string;
  accountTitle: string;
  accountNumber: string;
  iban: string;
  qrCode: string;
  instructions: string;
  enabled: boolean;
}

export const DEFAULT_MERCHANTS: PaymentMerchantConfig[] = [
  {
    providerId: 'askari',
    name: 'Askari Bank of Pakistan',
    accountTitle: 'Artas Yaskar',
    accountNumber: '03810350012783',
    iban: 'PK48ASCM0003810350012783',
    qrCode: '',
    instructions: 'Perform an IBAN transfer or local bank transfer to the Askari bank account detailed above. Save your confirmation receipt or TRX ID.',
    enabled: true,
  }
];

// paymentAdapter logic has been migrated to src/lib/db.ts
// This file only maintains the Types and Defaults.

export function getMerchantConfigs(): PaymentMerchantConfig[] {
  console.warn("Deprecated: use fetchPaymentMerchants from '@/lib/db'");
  return DEFAULT_MERCHANTS;
}

export function saveMerchantConfigs(configs: PaymentMerchantConfig[]) {
  console.warn("Deprecated: use Firestore to save merchant configs directly");
}
