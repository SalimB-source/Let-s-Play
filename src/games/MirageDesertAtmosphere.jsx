import React from 'react';

/** Décor d'ambiance partagé par le jeu et son lobby : grains de sable et éclats de diamant. */
export default function MirageDesertAtmosphere() {
  return (
    <div className="mirage-desert-atmosphere" aria-hidden="true">
      <span className="mirage-debris-shard is-sand sand-1" />
      <span className="mirage-debris-shard is-diamond diamond-1" />
      <span className="mirage-debris-shard is-sand sand-2" />
      <span className="mirage-debris-shard is-diamond diamond-2" />
      <span className="mirage-debris-shard is-sand sand-3" />
      <span className="mirage-debris-shard is-diamond diamond-3" />
    </div>
  );
}
