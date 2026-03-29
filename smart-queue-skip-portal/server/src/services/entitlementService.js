import { calculateRation } from "./rationCalculator.js";

export const calculateEntitlement = ({ cardType, familyMembers }) => {
  const entitlement = calculateRation({ cardType, familyMembers });

  return {
    ...entitlement,
    riceKg: entitlement.rice,
    sugarKg: entitlement.sugar,
    wheatKg: entitlement.wheat,
    oilLitres: entitlement.oil,
    dalKg: entitlement.dal,
    saltKg: entitlement.salt,
    keroseneLitres: entitlement.kerosene,
  };
};
