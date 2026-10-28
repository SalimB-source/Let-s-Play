// La balance des Heures d'un transfert Ténèbres, rendue réellement.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import RpgDuelPage, { BalanceTenebres } from '../src/games/RpgDuelPage.jsx';

void RpgDuelPage;

const effetJoueur = Object.freeze({
  effectId: 'balance-3',
  coteSource: 'joueur',
  montant: 2,
  sourceCarteId: 'le-poids',
});

const effetSorcier = Object.freeze({
  effectId: 'balance-4',
  coteSource: 'sorcier',
  montant: 1,
  sourceCarteId: null,
});

export function rendreBalanceJoueur() {
  return renderToStaticMarkup(<BalanceTenebres effet={effetJoueur} />);
}

export function rendreBalanceSorcier() {
  return renderToStaticMarkup(<BalanceTenebres effet={effetSorcier} />);
}
