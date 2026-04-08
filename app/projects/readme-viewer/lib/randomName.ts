// Whimsical filename generator for PDF exports.
//
// Picks `${adjective}_${noun}` from short curated word lists. Names are
// memorable, kid-safe, and unique enough that you won't collide if you
// export a few dozen times in a session.

const ADJECTIVES = [
  "tomato", "banana", "electric", "sleepy", "golden", "crimson", "neon",
  "cosmic", "frosty", "lazy", "brave", "wild", "silver", "lunar", "velvet",
  "copper", "hidden", "mighty", "tiny", "swift", "quiet", "fuzzy", "sunny",
  "midnight", "spicy", "humble", "curious", "honest", "jolly", "feral",
  "purple", "crystal", "amber", "stormy", "drowsy", "polite", "rowdy",
] as const;

const NOUNS = [
  "rocket", "panda", "cactus", "comet", "ninja", "falcon", "otter", "prism",
  "ember", "raven", "breeze", "glacier", "dragon", "badger", "koala",
  "puffin", "lemur", "sprite", "willow", "marble", "tiger", "moose",
  "walrus", "phoenix", "pebble", "clover", "thistle", "beacon", "anchor",
  "kite", "saber", "lantern", "harbor", "meadow", "satellite", "octopus",
] as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomDocumentName(): string {
  return `${pick(ADJECTIVES)}_${pick(NOUNS)}`;
}
