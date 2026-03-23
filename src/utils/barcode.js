export const getEAN13CheckDigit = (s) => {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(s[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const res = (10 - (sum % 10)) % 10;
  return res;
};

export const generateCarneBarcode = (item) => {
  if (!item) return '0000000000000';
  if (item.barcode && item.barcode.startsWith('2') && item.barcode.length === 13) {
    return item.barcode;
  }
  const FIXED_CODE = '946562';
  const cents = Math.round(parseFloat(item.sell_price || 0) * 100);
  const priceStr = String(cents).padStart(5, '0');
  const full12 = `2${FIXED_CODE}${priceStr}`;
  const checkDigit = getEAN13CheckDigit(full12);
  return `${full12}${checkDigit}`;
};
