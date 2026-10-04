/**
 * Les trois niveaux d'un quizz — la donnée minuscule, isolée du catalogue.
 * ----------------------------------------------------------------------
 * `QUIZ_LEVELS` vivait dans `src/quizzesData.js`, le gros fichier de données
 * (226 ko : banques de questions, libellés, miniatures). Or c'est la seule
 * chose dont `quizzes/quizProgress.js` a besoin — et `quizProgress` est lu par
 * la barre de navigation, donc présent sur **chaque page** du site. Le catalogue
 * entier partait ainsi dans le paquet d'entrée pour trois chaînes de
 * caractères.
 *
 * Le tableau vit ici, sans aucune dépendance ; `quizzesData.js` le ré-exporte
 * (`QUIZ_LEVELS` et son alias `QUIZ_DIFFICULTIES`) pour ne rien changer aux
 * consommateurs — lecteur de quizz, grille, succès.
 *
 * Facile est toujours ouvert ; chaque niveau terminé débloque le suivant.
 */
export const QUIZ_LEVELS = ['easy', 'medium', 'hard'];
