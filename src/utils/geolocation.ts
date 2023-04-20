import type { GeoPoint } from "firebase/firestore";

export type Degrees = number & { __unit: "degrees" };
export type Radians = number & { __unit: "radians" };

export type LatLng = {
  longitude: Degrees;
  latitude: Degrees;
};

export const EquatorRadius = 6378137;
export const PolarRadius = 6356752;

declare global {
  interface Math {
    abs(x: Degrees): Degrees;
    abs(x: Radians): Radians;
    atan(x: number): Radians;
    atan2(y: number, x: number): Radians;
    cos(x: Radians): number;
    sin(x: Radians): number;
    tan(x: Radians): number;
  }
}

export function fromGeoPoint(pt: GeoPoint): LatLng {
  return pt as any as LatLng;
}

export function degrees(deg: number): Degrees {
  return deg as Degrees;
}

export function radians(rad: number): Radians {
  return rad as Radians;
}

function sub<T extends Degrees | Radians>(a: T, b: T): T {
  return (a - b) as T;
}

function add<T extends Degrees | Radians>(a: T, b: T): T {
  return (a + b) as T;
}

function div<T extends Degrees | Radians>(a: T, b: number): T {
  return (a / b) as T;
}

function deg2rad(deg: Degrees): Radians {
  return ((deg * Math.PI) / 180) as Radians;
}

// true spherical approximation
function sphereDistance(l1: LatLng, l2: LatLng): number {
  const lat1 = deg2rad(l1.latitude);
  const lat2 = deg2rad(l2.latitude);
  const lon1 = deg2rad(l1.longitude);
  const lon2 = deg2rad(l2.longitude);

  const rad = Math.acos(
    Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1) +
      Math.sin(lat1) * Math.sin(lat2)
  );
  return rad * EquatorRadius;
}

function hubenyDistance(l1: LatLng, l2: LatLng) {
  const lat1 = deg2rad(l1.latitude);
  const lat2 = deg2rad(l2.latitude);
  const lon1 = deg2rad(l1.longitude);
  const lon2 = deg2rad(l2.longitude);

  const phi = div(add(lat1, lat2), 2);
  const M =
    PolarRadius / Math.sqrt(Math.pow(1 - 0.0066744 * Math.sin(phi), 2) ** 3);
  const N =
    EquatorRadius / Math.sqrt(Math.pow(1 - 0.0066744 * Math.sin(phi), 2));

  const dLat = sub(lat2, lat1);
  const dLon = sub(lon2, lon1);

  return Math.sqrt(
    Math.pow(M * dLat, 2) + Math.pow(N * Math.cos(phi) * dLon, 2)
  );
}

export function distance(l1: LatLng, l2: LatLng): number {
  const hubDis = hubenyDistance(l1, l2);

  if (hubDis < 1000000) {
    return hubDis;
  }

  return sphereDistance(l1, l2);
}
