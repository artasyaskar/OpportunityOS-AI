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
    providerId: 'easypaisa',
    name: 'Easypaisa Mobile Wallet',
    accountTitle: 'OpportunityOS Private Ltd',
    accountNumber: '03001234567',
    iban: 'N/A',
    qrCode: '', // Use merchant QR code image path if available
    instructions: 'Send the exact amount from your Easypaisa wallet to the merchant number above. Upload proof of transfer (TRX receipt screenshot).',
    enabled: true,
  },
  {
    providerId: 'jazzcash',
    name: 'JazzCash Mobile Wallet',
    accountTitle: 'OpportunityOS Private Ltd',
    accountNumber: '03017654321',
    iban: 'N/A',
    qrCode: '',
    instructions: 'Transfer the amount to the JazzCash mobile wallet. Copy the Transaction ID and upload the receipt.',
    enabled: true,
  },
  {
    providerId: 'askari',
    name: 'Askari Bank (Default)',
    accountTitle: 'OpportunityOS Private Ltd',
    accountNumber: '0123456789012',
    iban: 'PK45ASKB0123456789012',
    qrCode: '',
    instructions: 'Perform an IBAN transfer or local bank transfer to the Askari bank account detailed above. Save your confirmation PDF.',
    enabled: true,
  },
  {
    providerId: 'meezan',
    name: 'Meezan Bank Ltd',
    accountTitle: 'OpportunityOS Private Ltd',
    accountNumber: '998877665544',
    iban: 'PK67MEZN998877665544',
    qrCode: '',
    instructions: 'Transfer using your Meezan mobile banking app directly to the corporate account.',
    enabled: true,
  },
  {
    providerId: 'hbl',
    name: 'Habib Bank Limited (HBL)',
    accountTitle: 'OpportunityOS Private Ltd',
    accountNumber: '11223344556677',
    iban: 'PK89HABB11223344556677',
    qrCode: '',
    instructions: 'Transfer to HBL corporate account. Include your registered email in the transfer notes.',
    enabled: true,
  },
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
