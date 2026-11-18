/** Interruttore: l'area «Obiettivo peso» si spegne con EXPO_PUBLIC_WEIGHT_AREA=off (da usare nelle build pubbliche finché un dietista/medico non ha rivisto soglie e testi). */
export const WEIGHT_AREA = process.env.EXPO_PUBLIC_WEIGHT_AREA !== "off";
