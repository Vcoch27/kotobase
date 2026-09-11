/**
 * Firestore Data Serializer
 * Preserves Firestore-specific types (Timestamp, GeoPoint, DocumentReference, Bytes)
 * during JSON serialization so backups are lossless and accurately typed.
 */

export interface SerializedTimestamp {
  _type: "Timestamp";
  seconds: number;
  nanoseconds: number;
  iso: string;
}

export interface SerializedGeoPoint {
  _type: "GeoPoint";
  latitude: number;
  longitude: number;
}

export interface SerializedDocumentReference {
  _type: "DocumentReference";
  path: string;
}

export interface SerializedBytes {
  _type: "Bytes";
  base64: string;
}

export interface SerializedDate {
  _type: "Date";
  iso: string;
}

export type SerializedValue =
  | null
  | undefined
  | string
  | number
  | boolean
  | SerializedTimestamp
  | SerializedGeoPoint
  | SerializedDocumentReference
  | SerializedBytes
  | SerializedDate
  | SerializedValue[]
  | { [key: string]: SerializedValue };

/**
 * Checks if a value is a Firestore Timestamp
 */
function isFirestoreTimestamp(val: any): boolean {
  return (
    val !== null &&
    typeof val === "object" &&
    typeof val.toDate === "function" &&
    typeof val.toMillis === "function" &&
    typeof val.seconds === "number" &&
    typeof val.nanoseconds === "number"
  );
}

/**
 * Checks if a value is a Firestore GeoPoint
 */
function isFirestoreGeoPoint(val: any): boolean {
  return (
    val !== null &&
    typeof val === "object" &&
    typeof val.latitude === "number" &&
    typeof val.longitude === "number" &&
    (val.constructor?.name === "GeoPoint" || (val._latitude !== undefined && val._longitude !== undefined))
  );
}

/**
 * Checks if a value is a Firestore DocumentReference
 */
function isFirestoreDocumentReference(val: any): boolean {
  return (
    val !== null &&
    typeof val === "object" &&
    typeof val.path === "string" &&
    typeof val.collection === "function" &&
    typeof val.listCollections === "function"
  );
}

/**
 * Checks if a value is Firestore Bytes / Buffer / Uint8Array
 */
function isBytesOrBuffer(val: any): boolean {
  if (!val || typeof val !== "object") return false;
  if (Buffer.isBuffer(val)) return true;
  if (val instanceof Uint8Array) return true;
  if (typeof val.toBase64 === "function") return true;
  return false;
}

/**
 * Recursively serializes any Firestore value or document data object
 */
export function serializeFirestoreValue(val: any): SerializedValue {
  if (val === null || val === undefined) {
    return val;
  }

  // Primitive types
  if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
    return val;
  }

  // Firestore Timestamp
  if (isFirestoreTimestamp(val)) {
    return {
      _type: "Timestamp",
      seconds: val.seconds,
      nanoseconds: val.nanoseconds,
      iso: val.toDate().toISOString(),
    };
  }

  // Firestore GeoPoint
  if (isFirestoreGeoPoint(val)) {
    return {
      _type: "GeoPoint",
      latitude: val.latitude,
      longitude: val.longitude,
    };
  }

  // Firestore DocumentReference
  if (isFirestoreDocumentReference(val)) {
    return {
      _type: "DocumentReference",
      path: val.path,
    };
  }

  // Bytes or Buffer
  if (isBytesOrBuffer(val)) {
    let base64 = "";
    if (typeof val.toBase64 === "function") {
      base64 = val.toBase64();
    } else if (Buffer.isBuffer(val)) {
      base64 = val.toString("base64");
    } else if (val instanceof Uint8Array) {
      base64 = Buffer.from(val).toString("base64");
    }
    return {
      _type: "Bytes",
      base64,
    };
  }

  // JavaScript Date
  if (val instanceof Date) {
    return {
      _type: "Date",
      iso: val.toISOString(),
    };
  }

  // Array
  if (Array.isArray(val)) {
    return val.map((item) => serializeFirestoreValue(item));
  }

  // Plain Object / Map
  if (typeof val === "object") {
    const result: { [key: string]: SerializedValue } = {};
    for (const key of Object.keys(val)) {
      result[key] = serializeFirestoreValue(val[key]);
    }
    return result;
  }

  // Fallback
  return String(val);
}
