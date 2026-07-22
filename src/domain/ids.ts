export type EntityId = string & { readonly __brand: "EntityId" };

let sequence = 0;

export function createId(): EntityId {
  sequence = (sequence + 1) % Number.MAX_SAFE_INTEGER;

  const timePart = Date.now().toString(36);
  const sequencePart = sequence.toString(36).padStart(4, "0");
  const randomPart = Math.random().toString(36).slice(2, 12);

  return `id_${timePart}_${sequencePart}_${randomPart}` as EntityId;
}
