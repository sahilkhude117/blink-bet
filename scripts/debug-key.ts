/**
 * Debug Private Key Format
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const rawKey = process.env.KALSHI_PRIVATE_KEY;
const processedKey = rawKey ? rawKey.replace(/\\n/g, '\n') : '';

console.log('\n🔍 Debugging Private Key Format...\n');
console.log('Raw key length:', rawKey?.length);
console.log('Processed key length:', processedKey.length);
console.log('\nFirst 100 chars of raw key:');
console.log(rawKey?.slice(0, 100));
console.log('\nFirst 100 chars of processed key:');
console.log(processedKey.slice(0, 100));
console.log('\nLast 100 chars of processed key:');
console.log(processedKey.slice(-100));
console.log('\nChecking for literal backslash-n:');
console.log('Contains \\n:', rawKey?.includes('\\n'));
console.log('Contains actual newline:', rawKey?.includes('\n'));
console.log('\nProcessed key starts with:', processedKey.slice(0, 50));
