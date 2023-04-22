import type {GeoPoint} from 'firebase-admin/firestore';

/**
 * angle in degrees
 */
export type Degrees = number & { __unit: 'degrees' };
/**
 * angle in radians
 */
export type Radians = number & { __unit: 'radians' };

/**
 * latitude and longitude
 */
export type LatLng = {
  longitude: Degrees;
  latitude: Degrees;
};

/**
 * equator radius of the Earth in meters
 */
export const EquatorRadius = 6378137;
/**
 * polar radius of the Earth in meters
 */
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

/**
 * GeoPointをLatLngに変換する
 * @param {GeoPoint} pt GeoPoint
 * @return {LatLng} LatLng
 */
export function fromGeoPoint(pt: GeoPoint): LatLng {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return pt as any as LatLng;
}

/**
 * numberをDegreesに変換する
 * @param {number} deg number
 * @return {Degrees} degrees
 */
export function degrees(deg: number): Degrees {
  return deg as Degrees;
}

/**
 * numberをRadiansに変換する
 * @param {number} rad number
 * @return {Radians} radians
 */
export function radians(rad: number): Radians {
  return rad as Radians;
}

/**
 * subtract two angles
 * @template {Degrees | Radians} T angle type
 * @param {T} a angle a
 * @param {T} b angle b
 * @return {T} difference of a and b
 */
function sub<T extends Degrees | Radians>(a: T, b: T): T {
  return (a - b) as T;
}

/**
 * add two angles
 * @template {Degrees | Radians} T angle type
 * @param {T} a angle a
 * @param {T} b angle b
 * @return {T} sum of a and b
 */
function add<T extends Degrees | Radians>(a: T, b: T): T {
  return (a + b) as T;
}

/**
 * divide an angle by a number
 * @template {Degrees | Radians} T angle type
 * @param {T} a angle a
 * @param {number} b divisor
 * @return {T} division of a and b
 */
function div<T extends Degrees | Radians>(a: T, b: number): T {
  return (a / b) as T;
}

/**
 * convert degrees to radians
 * @param {Degrees} deg degrees
 * @return {Radians} radians
 */
function deg2rad(deg: Degrees): Radians {
  return ((deg * Math.PI) / 180) as Radians;
}

/**
 * true spherical approximation of the distance
 * @param {LatLng} l1 coordinates of point 1
 * @param {LatLng} l2 coordinates of point 2
 * @return {number} distance in meters, true spherical approximation
 */
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

/**
 * hubeny approximation of the distance
 * @param {LatLng} l1 coordinates of point 1
 * @param {LatLng} l2 coordinates of point 2
 * @return {number} distance in meters, hubeny approximation
 */
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

/**
 * caculate the distance between two points
 * @param {LatLng} l1 coordinates of point 1
 * @param {LatLng} l2 coordinates of point 2
 * @return {number} approximate distance in meters
 */
export function distance(l1: LatLng, l2: LatLng): number {
  const hubDis = hubenyDistance(l1, l2);

  if (hubDis < 1000000) {
    return hubDis;
  }

  return sphereDistance(l1, l2);
}
