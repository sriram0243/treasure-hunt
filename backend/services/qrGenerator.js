const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const DEFAULT_TOKENS = [
  'TH_STAGE1_MARK_9F8A3C12E45B67890123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
  'TH_STAGE2_MARK_7E6D5C4B3A219876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876',
  'TH_STAGE3_MARK_1A2B3C4D5E6F7890123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
  'TH_STAGE4_MARK_9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA9876543210FEDCBA',
  'TH_STAGE5_MARK_A1B2C3D4E5F67890123456789ABCDEF0123456789ABCDEF0123456789ABCDEF',
  'TH_STAGE6_MARK_F0E9D8C7B6A543210987654321FEDCBA0987654321FEDCBA0987654321FEDCBA',
  'TH_STAGE7_MARK_TREASURE_UNLOCKED_FINAL_MARK_99887766554433221100AABBCCDDEEFF'
];

async function generateAllQRCodes() {
  const isVercel = Boolean(process.env.VERCEL);
  const outputDir = isVercel
    ? path.join('/tmp', 'qr-codes')
    : path.join(__dirname, '..', '..', 'qr-codes');

  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  } catch (err) {
    console.warn('[QR GENERATOR] Directory create notice:', err.message);
  }

  console.log(`[QR GENERATOR] Output Directory: ${outputDir}`);

  for (let i = 0; i < 7; i++) {
    const stageNum = (i + 1).toString().padStart(2, '0');
    const token = DEFAULT_TOKENS[i];

    const pngFile = path.join(outputDir, `qr-stage-${stageNum}.png`);
    const svgFile = path.join(outputDir, `qr-stage-${stageNum}.svg`);

    const pngOptions = {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 1.0,
      margin: 4,
      width: 600,
      color: {
        dark: '#0A1813', // Deep rich dark green border
        light: '#FFFFFF' // Bright white quiet zone for easy scanning
      }
    };

    const svgOptions = {
      errorCorrectionLevel: 'H',
      type: 'svg',
      margin: 4,
      color: {
        dark: '#0A1813',
        light: '#FFFFFF'
      }
    };

    try {
      await QRCode.toFile(pngFile, token, pngOptions);
      await QRCode.toFile(svgFile, token, svgOptions);
      console.log(`✓ Generated: qr-stage-${stageNum}.png & qr-stage-${stageNum}.svg`);
    } catch (err) {
      console.error(`✗ Error generating QR for stage ${stageNum}:`, err);
    }
  }
  console.log('[QR GENERATOR] All 7 QR codes successfully generated!');
}

if (require.main === module) {
  generateAllQRCodes();
}

module.exports = { generateAllQRCodes, DEFAULT_TOKENS };
