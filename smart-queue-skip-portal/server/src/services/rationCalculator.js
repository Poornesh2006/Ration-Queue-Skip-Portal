const normalizeCardType = (cardType = "") => {
  const normalized = String(cardType).toUpperCase().trim();
  return normalized === "PHH-AAY" ? "AAY" : normalized;
};

const calculateRice = ({ cardType, familyMembers }) => {
  if (cardType === "AAY") {
    return 35;
  }

  if (familyMembers === 1) {
    return 12;
  }

  if (familyMembers === 2) {
    return 16;
  }

  return familyMembers * 5;
};

export const calculateRation = ({ cardType, familyMembers, includeWheat = true } = {}) => {
  const normalizedCardType = normalizeCardType(cardType);
  const members = Math.max(1, Number(familyMembers) || 1);

  const rice = calculateRice({
    cardType: normalizedCardType,
    familyMembers: members,
  });

  const sugar = Math.min(2, Number((members * 0.5).toFixed(2)));
  const wheat = includeWheat && normalizedCardType !== "AAY" ? 10 : 0;
  const oil = normalizedCardType === "AAY" ? 2 : 1;
  const dal = normalizedCardType === "AAY" ? 2 : 1;
  const salt = 1;
  const kerosene = normalizedCardType === "AAY" ? 3 : members <= 2 ? 1 : 2;

  return {
    rice,
    sugar,
    wheat,
    oil,
    dal,
    salt,
    kerosene,
  };
};

export { normalizeCardType };
