/**
 * STEM Problem Game — UI Strings (bilingual)
 * Source: GDD §5 (UI Design), §7 (Tutorial)
 * Add all user-facing text here. Never hardcode strings in components.
 */

import type { Domain, Difficulty } from '../game/types';

export type Lang = 'fr' | 'en';

export const UI = {
  // ── Variable states ──────────────────────────────────────────
  varKnown:        { fr: 'Connue', en: 'Known' },
  varUnknown:      { fr: 'Inconnue', en: 'Unknown' },
  varGoal:         { fr: 'Objectif', en: 'Goal' },
  varNewlyFound:        { fr: 'Identifiée !', en: 'Identified!' },
  varHypothesisTooltip: { fr: 'Donnée de départ', en: 'Starting value' },

  // ── Formula states ───────────────────────────────────────────
  formulaActivatable:  { fr: 'Activable ⚡', en: 'Activatable ⚡' },
  formulaLocked:       { fr: 'Bloquée', en: 'Locked' },
  formulaActivated:    { fr: 'Utilisée ✓', en: 'Used ✓' },
  activateButton:      { fr: 'Activer', en: 'Activate' },
  unknownsRemaining:   { fr: (n: number) => `${n} variable(s) inconnue(s)`, en: (n: number) => `${n} unknown variable(s)` },
  formulaReveals:      { fr: 'Révèle : {0}', en: 'Reveals: {0}' },

  // ── Accessibility — ARIA labels & prefixes (WCAG AA) ───────────
  variableAriaPrefix: { fr: 'Variable', en: 'Variable' },
  formulaAriaPrefix:  { fr: 'Formule', en: 'Formula' },

  // ── Accessibility — screen-reader announcements (cascade activations) ──
  announceFormulaActivated: { fr: 'Formule {0} activée.', en: 'Formula {0} activated.' },
  announceVariableRevealed: { fr: 'Variable {0} identifiée.', en: 'Variable {0} identified.' },
  announceCascade:          { fr: '{0} formule(s) supplémentaire(s) maintenant activable(s).', en: '{0} more formula(s) now activatable.' },
  announceWin:              { fr: 'Problème résolu !', en: 'Problem solved!' },
  announceStuck:            { fr: 'Bloqué : plus aucune formule activable.', en: 'Stuck: no formula is activatable anymore.' },

  // ── Panels ───────────────────────────────────────────────────
  panelVariables:  { fr: 'Variables', en: 'Variables' },
  panelFormulas:   { fr: 'Formules', en: 'Formulas' },
  panelProgress:   { fr: 'Progression', en: 'Progress' },

  // ── Mobile ───────────────────────────────────────────────────
  swipeToActivate: { fr: 'Glisser pour activer →', en: 'Swipe to activate →' },

  // ── Progress ─────────────────────────────────────────────────
  goalsLabel:      { fr: 'Objectifs', en: 'Goals' },
  stepsLabel:      { fr: 'Étapes', en: 'Steps' },
  scoreLabel:      { fr: 'Score', en: 'Score' },
  hintsLabel:      { fr: 'Indices', en: 'Hints' },
  optimalLabel:    { fr: 'Optimal', en: 'Optimal' },

  // ── Hint system ──────────────────────────────────────────────
  hintButton:      { fr: 'Indice', en: 'Hint' },
  hintTier1:       { fr: 'Quelle formule ? (−50 pts)', en: 'Which formula? (−50 pts)' },
  hintTier2:       { fr: 'Quelle variable ? (−80 pts)', en: 'Which variable? (−80 pts)' },
  hintTier3:       { fr: 'Auto-activation (−120 pts)', en: 'Auto-activate (−120 pts)' },

  // ── Outcomes ─────────────────────────────────────────────────
  winTitle:        { fr: '🎉 Problème résolu !', en: '🎉 Problem Solved!' },
  stuckTitle:      { fr: '🔒 Bloqué', en: '🔒 Stuck' },
  stuckMsg:        { fr: 'Plus de formules activables. Essayez un indice.', en: 'No activatable formulas remain. Try a hint.' },

  // ── Exploration Mode ─────────────────────────────────────────
  explorationModeTitle:       { fr: 'Mode exploration', en: 'Exploration Mode' },
  explorationModeDescription: {
    fr: 'Ce problème n\'est pas résoluble avec les hypothèses actuelles. Choisissez une hypothèse supplémentaire à révéler pour débloquer la chaîne :',
    en: 'This problem isn\'t solvable from the current hypotheses. Choose an additional hypothesis to reveal to unlock the chain:',
  },
  explorationNoCandidateMsg:  {
    fr: 'Aucune hypothèse supplémentaire ne permet, seule, de débloquer ce problème.',
    en: 'No single additional hypothesis unlocks this problem.',
  },

  // ── Summary screen ───────────────────────────────────────────
  summaryTitle:    { fr: 'Résumé', en: 'Summary' },
  replayButton:    { fr: 'Rejouer', en: 'Replay' },
  nextButton:      { fr: 'Problème suivant', en: 'Next Problem' },
  parLabel:        { fr: 'Par (optimal)', en: 'Par (optimal)' },
  timeLabel:       { fr: 'Temps écoulé', en: 'Time elapsed' },
  scoreBaseLabel:        { fr: 'Score de base', en: 'Base score' },
  scoreStepPenaltyLabel: { fr: 'Pénalité (étapes)', en: 'Step penalty' },
  scoreHintPenaltyLabel: { fr: 'Pénalité (indices)', en: 'Hint penalty' },
  scoreTimeBonusLabel:   { fr: 'Bonus de temps', en: 'Time bonus' },
  scoreTotalLabel:       { fr: 'Score final', en: 'Final score' },

  // ── Tutorial ─────────────────────────────────────────────────
  tutStep1Title:   { fr: 'Découvrir les Variables', en: 'Meet the Variables' },
  tutStep1Desc:    {
    fr: 'Chaque carte représente une variable. ✓ vert = connue, ❓ gris = inconnue, 🎯 bleu = objectif à atteindre.',
    en: 'Each card represents a variable. ✓ green = known, ❓ gray = unknown, 🎯 blue = goal to reach.',
  },
  tutStep2Title:   { fr: 'Votre Première Formule', en: 'Your First Formula' },
  tutStep2Desc:    {
    fr: 'Une formule devient activable (⚡) quand il ne lui manque qu\'une seule variable. Cliquez sur « Activer » pour la révéler.',
    en: 'A formula becomes activatable (⚡) when only one of its variables is unknown. Click "Activate" to reveal it.',
  },
  tutStep2DescMobile: {
    fr: 'Une formule devient activable (⚡) quand il ne lui manque qu\'une seule variable. Glissez la carte vers la droite pour la révéler.',
    en: 'A formula becomes activatable (⚡) when only one of its variables is unknown. Swipe the card right to reveal it.',
  },
  tutStep3Title:   { fr: 'Réaction en Chaîne', en: 'Chain Reaction' },
  tutStep3Desc:    {
    fr: 'Bravo ! Cette activation a révélé une nouvelle variable, ce qui rend une autre formule activable. Activez-la pour continuer la cascade.',
    en: 'Nicely done! That activation revealed a new variable, unlocking another formula. Activate it to continue the cascade.',
  },
  tutStep3DescMobile: {
    fr: 'Bravo ! Cette activation a révélé une nouvelle variable, ce qui rend une autre formule activable. Glissez-la vers la droite pour continuer la cascade.',
    en: 'Nicely done! That activation revealed a new variable, unlocking another formula. Swipe it right to continue the cascade.',
  },
  tutStep4Title:   { fr: 'Atteindre l\'Objectif', en: 'Reach the Goal' },
  tutStep4Desc:    {
    fr: 'La barre de progression indique votre avancement vers l\'objectif 🎯. Activez la dernière formule pour révéler la conclusion et gagner !',
    en: 'The progress bar shows how close you are to the goal 🎯. Activate the last formula to reveal the conclusion and win!',
  },
  tutStep4DescMobile: {
    fr: 'Il ne reste qu\'une formule ! Glissez-la vers la droite pour révéler la conclusion 🎯 et gagner.',
    en: 'Just one formula left! Swipe it right to reveal the conclusion 🎯 and win.',
  },
  tutNext:          { fr: 'Suivant →', en: 'Next →' },
  tutSkip:          { fr: 'Passer le tutoriel', en: 'Skip tutorial' },
  tutStepIndicator: { fr: (n: number) => `Étape ${n} / 4`, en: (n: number) => `Step ${n} / 4` },

  // ── Misc ─────────────────────────────────────────────────────
  loading:         { fr: 'Chargement…', en: 'Loading…' },
  offlineBadge:    { fr: '⟳ Synchronisation en attente', en: '⟳ Pending sync' },
  helpButton:      { fr: '?', en: '?' },

  // ── Domains ──────────────────────────────────────────────────
  domainPhysics:     { fr: 'Physique', en: 'Physics' },
  domainChemistry:   { fr: 'Chimie', en: 'Chemistry' },
  domainMathematics: { fr: 'Mathématiques', en: 'Mathematics' },
  domainBiology:     { fr: 'Biologie', en: 'Biology' },
  domainEngineering: { fr: 'Ingénierie', en: 'Engineering' },

  // ── Difficulties ─────────────────────────────────────────────
  difficultyBeginner:     { fr: 'Débutant', en: 'Beginner' },
  difficultyIntermediate: { fr: 'Intermédiaire', en: 'Intermediate' },
  difficultyAdvanced:     { fr: 'Avancé', en: 'Advanced' },
  difficultyExpert:       { fr: 'Expert', en: 'Expert' },

  // ── Problem Library ──────────────────────────────────────────
  problemLibraryTitle:   { fr: 'Bibliothèque de problèmes', en: 'Problem Library' },
  domainFilterLabel:     { fr: 'Domaine', en: 'Domain' },
  difficultyFilterLabel: { fr: 'Difficulté', en: 'Difficulty' },
  allDomainsOption:      { fr: 'Tous les domaines', en: 'All domains' },
  allDifficultiesOption: { fr: 'Toutes les difficultés', en: 'All difficulties' },
  completedBadge:        { fr: '✓ Complété', en: '✓ Completed' },
  previousScoreLabel:    { fr: 'Score précédent', en: 'Previous score' },
  noResultsMsg:          { fr: 'Aucun problème ne correspond à ces filtres.', en: 'No problems match these filters.' },
  lockedBadge:           { fr: '🔒 Verrouillé', en: '🔒 Locked' },
  lockedMsg:             { fr: 'Terminez le problème précédent pour déverrouiller.', en: 'Complete the previous problem to unlock.' },

  // ── Achievements ─────────────────────────────────────────────
  achievementsTitle:        { fr: 'Réussites', en: 'Achievements' },
  badgeDomainMasteredTitle: { fr: 'Domaine maîtrisé', en: 'Domain Mastered' },
  badgeDomainMasteredDesc:  { fr: 'Tous les problèmes de ce domaine sont complétés.', en: 'All problems in this domain are completed.' },
  badgeParAchievedTitle:    { fr: 'Par atteint', en: 'Par Achieved' },
  badgeParAchievedDesc:     { fr: 'Résolu en un nombre optimal d\'étapes.', en: 'Solved in the optimal number of steps.' },
  badgeLightningSpeedTitle: { fr: 'Vitesse éclair', en: 'Lightning Speed' },
  badgeLightningSpeedDesc:  { fr: 'Résolu en moins de 60 secondes.', en: 'Solved in under 60 seconds.' },
  badgeLockedStatus:        { fr: 'Non débloqué', en: 'Not unlocked' },
  noBadgesMsg:              { fr: 'Aucun badge débloqué pour le moment.', en: 'No badges unlocked yet.' },

  // ── Deduction Replay ─────────────────────────────────────────
  deductionReplayTitle:    { fr: 'Rejeu de la déduction', en: 'Deduction Replay' },
  deductionStepInitial:    { fr: 'État initial : hypothèses connues', en: 'Initial state: hypotheses known' },
  deductionStepActivated:  { fr: 'Formule activée', en: 'Activated formula' },
  deductionReveals:        { fr: 'révèle', en: 'reveals' },
  replayPlay:              { fr: 'Lecture', en: 'Play' },
  replayPause:             { fr: 'Pause', en: 'Pause' },
  replayPrevStep:          { fr: 'Étape précédente', en: 'Previous step' },
  replayNextStep:          { fr: 'Étape suivante', en: 'Next step' },
  replaySpeedLabel:        { fr: 'Vitesse', en: 'Speed' },
  replayStepIndicator:     { fr: (n: number, total: number) => `Étape ${n} / ${total}`, en: (n: number, total: number) => `Step ${n} / ${total}` },

  // ── Help Panel ───────────────────────────────────────────────
  helpPanelTitle:        { fr: 'Aide', en: 'Help' },
  helpCloseButton:       { fr: 'Fermer', en: 'Close' },
  helpPhaseSetupTitle:    { fr: 'Préparation', en: 'Setting up' },
  helpPhaseSetupDesc:     { fr: 'Le problème est en cours de chargement.', en: 'The problem is loading.' },
  helpPhaseScanTitle:     { fr: 'Phase de recherche', en: 'Scanning' },
  helpPhaseScanDesc:      {
    fr: 'Observez les variables connues (✓) et repérez une formule activable (⚡) : elle devient activable quand il ne lui manque qu\'une seule variable.',
    en: 'Look at the known variables (✓) and find an activatable formula (⚡): it becomes activatable when only one of its variables is unknown.',
  },
  helpPhaseActivateTitle: { fr: 'Activation', en: 'Activation' },
  helpPhaseActivateDesc:  {
    fr: 'Cliquez sur « Activer » (ou glissez la carte sur mobile) pour appliquer la formule sélectionnée et révéler sa variable inconnue.',
    en: 'Click "Activate" (or swipe the card on mobile) to apply the selected formula and reveal its unknown variable.',
  },
  helpPhaseCascadeTitle:  { fr: 'Cascade', en: 'Cascade' },
  helpPhaseCascadeDesc:   {
    fr: 'Cette activation vient de révéler une nouvelle variable, ce qui peut rendre d\'autres formules activables. Continuez la cascade !',
    en: 'That activation just revealed a new variable, which may unlock other formulas. Keep the cascade going!',
  },
  helpPhaseWinTitle:      { fr: 'Résolu !', en: 'Solved!' },
  helpPhaseWinDesc:       {
    fr: 'Toutes les conclusions ont été identifiées. Consultez l\'écran de résumé pour voir votre score.',
    en: 'All conclusions have been identified. Check the summary screen to see your score.',
  },
  helpPhaseStuckTitle:    { fr: 'Bloqué', en: 'Stuck' },
  helpPhaseStuckDesc:     {
    fr: 'Aucune formule n\'est activable et l\'objectif n\'est pas encore atteint. Essayez un indice pour débloquer la situation.',
    en: 'No formula is activatable and the goal hasn\'t been reached yet. Try a hint to get unstuck.',
  },

  // ── Glossary ─────────────────────────────────────────────────
  glossaryTitle:           { fr: 'Glossaire de déduction', en: 'Deduction Glossary' },
  glossaryButton:          { fr: 'Glossaire', en: 'Glossary' },
  glossaryBackButton:      { fr: '← Retour', en: '← Back' },
  glossaryVariableTerm:    { fr: 'Variable', en: 'Variable' },
  glossaryVariableDesc:    { fr: 'Une grandeur symbolique dans un problème.', en: 'A symbolic quantity in a problem.' },
  glossaryFormulaTerm:     { fr: 'Formule', en: 'Formula' },
  glossaryFormulaDesc:     { fr: 'Une relation reliant un sous-ensemble de variables.', en: 'A relationship linking a subset of variables.' },
  glossaryHypothesisTerm:  { fr: 'Hypothèse', en: 'Hypothesis' },
  glossaryHypothesisDesc:  { fr: 'Une variable connue au début de la partie (H).', en: 'A variable known at the start of the game (H).' },
  glossaryConclusionTerm:  { fr: 'Conclusion', en: 'Conclusion' },
  glossaryConclusionDesc:  { fr: 'Une variable cible à identifier (C).', en: 'A target variable to identify (C).' },
  glossaryActivationTerm:  { fr: 'Activation', en: 'Activation' },
  glossaryActivationDesc:  { fr: 'L\'action d\'appliquer une formule pour révéler son inconnue.', en: 'The act of applying a formula to reveal its unknown.' },
  glossaryCascadeTerm:     { fr: 'Cascade', en: 'Cascade' },
  glossaryCascadeDesc:     { fr: 'Chaîne d\'activations déclenchées par une activation précédente.', en: 'Chain of activations triggered by a previous activation.' },

  // ── Brand ────────────────────────────────────────────────────
  appName:         { fr: 'Défi STEM', en: 'STEM Challenge' },

  // ── Home hero ────────────────────────────────────────────────
  heroWelcome:     { fr: 'Bonjour, {0} !', en: 'Hello, {0}!' },
  heroSubtitle:    { fr: 'Prêt pour un nouveau défi ?', en: 'Ready for a new challenge?' },
  heroPlayButton:  { fr: 'Jouer maintenant', en: 'Play now' },

  // ── Home stat-cards ──────────────────────────────────────────
  statProblemsSolved: { fr: 'Problèmes résolus', en: 'Problems solved' },
  statBestScore:      { fr: 'Meilleur score', en: 'Best score' },
  statAchievements:   { fr: 'Réussites', en: 'Achievements' },

  // ── Library domain cards ─────────────────────────────────────
  libraryProblemsCount:   { fr: (n: number) => `${n} problème(s)`, en: (n: number) => `${n} problem(s)` },

  // ── Achievement progress ─────────────────────────────────────
  achievementProgressLabel: { fr: (x: number, total: number) => `${x} / ${total} réussites débloquées`, en: (x: number, total: number) => `${x} / ${total} achievements unlocked` },

  // ── Navigation ───────────────────────────────────────────────
  navGame:         { fr: 'Jeu', en: 'Game' },
  navLibrary:      { fr: 'Bibliothèque', en: 'Library' },
  navAchievements: { fr: 'Réussites', en: 'Achievements' },
  navInstructor:   { fr: 'Enseignant', en: 'Instructor' },
  navResearch:     { fr: 'Recherche', en: 'Research' },
  navEditor:       { fr: 'Éditeur', en: 'Editor' },
  navSignOut:      { fr: 'Se déconnecter', en: 'Sign out' },

  // ── Instructor Dashboard ─────────────────────────────────────
  instructorDashboardTitle:     { fr: 'Tableau de bord — Enseignant', en: 'Instructor Dashboard' },
  accessDeniedTitle:            { fr: 'Accès refusé', en: 'Access Denied' },
  accessDeniedMsg:               { fr: 'Cette page est réservée aux enseignants.', en: 'This page is restricted to instructors.' },
  noCohortAssignedTitle:        { fr: 'Aucune cohorte assignée', en: 'No Cohort Assigned' },
  noCohortAssignedMsg:           { fr: 'Votre compte enseignant n\'est associé à aucune cohorte pour le moment. Contactez un administrateur.', en: 'Your instructor account is not yet associated with a cohort. Contact an administrator.' },
  studentsSectionTitle:         { fr: 'Étudiants', en: 'Students' },
  avgScoreLabel:                 { fr: 'Score moyen', en: 'Average score' },
  scoreConfigSectionTitle:       { fr: 'Configuration du score', en: 'Score Configuration' },
  scoreConfigMaxScoreLabel:      { fr: 'Score maximum', en: 'Max score' },
  scoreConfigStepPenaltyLabel:   { fr: 'Pénalité par étape', en: 'Step penalty' },
  scoreConfigHintPenaltyLabel:   { fr: 'Pénalité par indice', en: 'Hint penalty' },
  scoreConfigTimeBonusBaseLabel: { fr: 'Bonus de temps (base)', en: 'Time bonus base' },
  scoreConfigTimeBonusRateLabel: { fr: 'Bonus de temps (taux)', en: 'Time bonus rate' },
  scoreConfigSaveButton:         { fr: 'Enregistrer', en: 'Save' },
  scoreConfigSavedMsg:           { fr: 'Configuration enregistrée.', en: 'Configuration saved.' },
  scoreConfigErrorMsg:           { fr: 'Échec de l\'enregistrement.', en: 'Failed to save.' },
  leaderboardSectionTitle:       { fr: 'Classement', en: 'Leaderboard' },
  enableLeaderboardLabel:        { fr: 'Afficher le classement de la cohorte aux élèves', en: 'Show the cohort leaderboard to students' },
  leaderboardSavedMsg:           { fr: 'Préférence enregistrée.', en: 'Preference saved.' },
  leaderboardErrorMsg:           { fr: 'Échec de l\'enregistrement.', en: 'Failed to save.' },

  // ── Problem Editor ────────────────────────────────────────────
  problemEditorTitle:      { fr: 'Créer un problème', en: 'Create Problem' },
  problemDetailsSectionTitle: { fr: 'Détails du problème', en: 'Problem Details' },
  idLabel:                 { fr: 'Identifiant', en: 'ID' },
  problemTitleLabel:       { fr: 'Titre (EN)', en: 'Title (EN)' },
  problemTitleFrLabel:     { fr: 'Titre (FR)', en: 'Title (FR)' },
  hypothesesSectionTitle:  { fr: 'Hypothèses (H)', en: 'Hypotheses (H)' },
  conclusionsSectionTitle: { fr: 'Conclusions (C)', en: 'Conclusions (C)' },
  addVariableButton:       { fr: '+ Ajouter une variable', en: '+ Add variable' },
  addFormulaButton:        { fr: '+ Ajouter une formule', en: '+ Add formula' },
  removeButton:            { fr: 'Supprimer', en: 'Remove' },
  variableIdLabel:         { fr: 'ID', en: 'ID' },
  variableLabelLabel:      { fr: 'Nom (EN)', en: 'Label (EN)' },
  variableLabelFrLabel:    { fr: 'Nom (FR)', en: 'Label (FR)' },
  variableUnitLabel:       { fr: 'Unité', en: 'Unit' },
  formulaIdLabel:          { fr: 'ID', en: 'ID' },
  formulaExpressionLabel:    { fr: 'Expression (EN)', en: 'Expression (EN)' },
  formulaExpressionFrLabel:  { fr: 'Expression (FR)', en: 'Expression (FR)' },
  formulaVariablesLabel:   { fr: 'Variables impliquées', en: 'Variables involved' },
  createProblemButton:     { fr: 'Créer le problème', en: 'Create Problem' },
  unsolvableErrorMsg:      {
    fr: 'Ce problème n\'est pas résoluble : les conclusions ne sont pas atteignables à partir des hypothèses.',
    en: 'This problem is not solvable: the conclusions are not reachable from the hypotheses.',
  },
  requiredFieldsMsg:       { fr: 'Veuillez remplir tous les champs obligatoires.', en: 'Please fill in all required fields.' },
  optimalPathSectionTitle: { fr: 'Chemin de déduction optimal', en: 'Optimal Deduction Path' },
  problemCreatedMsg:       { fr: (n: number) => `Problème créé avec succès (${n} étapes optimales).`, en: (n: number) => `Problem created successfully (${n} optimal steps).` },
  createProblemErrorMsg:   { fr: 'Échec de la création du problème.', en: 'Failed to create the problem.' },

  // ── Authentication ────────────────────────────────────────────
  loginTitle:            { fr: 'Connexion', en: 'Log In' },
  signupTitle:           { fr: 'Créer un compte', en: 'Create Account' },
  emailLabel:            { fr: 'E-mail', en: 'Email' },
  passwordLabel:         { fr: 'Mot de passe', en: 'Password' },
  loginButton:           { fr: 'Se connecter', en: 'Log In' },
  signupButton:          { fr: 'Créer le compte', en: 'Create Account' },
  switchToSignupPrompt:  { fr: 'Pas encore de compte ? Créer un compte', en: "Don't have an account? Sign up" },
  switchToLoginPrompt:   { fr: 'Déjà un compte ? Se connecter', en: 'Already have an account? Log in' },
  signupSuccessMsg:      { fr: 'Compte créé ! Vérifiez votre e-mail pour confirmer votre inscription.', en: 'Account created! Check your email to confirm your registration.' },
  logoutButton:          { fr: 'Se déconnecter', en: 'Log Out' },

  // ── Offline sync ─────────────────────────────────────────────
  pendingEventsBadge:    { fr: '⟳ en attente', en: '⟳ pending' },

  // ── GDPR Consent ─────────────────────────────────────────────
  consentTitle:          { fr: 'Confidentialité de vos données', en: 'Your Data Privacy' },
  consentBody:           {
    fr: 'Nous collectons vos données de jeu (progression, scores, temps passé) pour personnaliser votre expérience et améliorer le jeu. Vos données ne sont jamais partagées avec des tiers. Vous pouvez demander leur suppression à tout moment.',
    en: 'We collect your gameplay data (progress, scores, time spent) to personalize your experience and improve the game. Your data is never shared with third parties. You may request its deletion at any time.',
  },
  consentAcceptButton:   { fr: 'J\'accepte', en: 'I Accept' },
  consentDeclineButton:  { fr: 'Refuser', en: 'Decline' },

  // ── Settings — Privacy (GDD §8.4 GDPR) ────────────────────────
  settingsTitle:             { fr: 'Réglages', en: 'Settings' },
  settingsButton:            { fr: 'Réglages', en: 'Settings' },
  privacySectionTitle:       { fr: 'Confidentialité', en: 'Privacy' },
  deleteDataButton:          { fr: 'Supprimer mes données', en: 'Delete my data' },
  deleteDataDescription:     {
    fr: 'Supprimer définitivement vos informations personnelles (nom, e-mail). Vos statistiques de jeu resteront anonymisées pour la recherche.',
    en: 'Permanently remove your personal information (name, email). Your gameplay statistics will remain, anonymised, for research.',
  },
  deleteDataConfirmTitle:    { fr: 'Confirmer la suppression', en: 'Confirm deletion' },
  deleteDataConfirmBody:     {
    fr: 'Cette action est irréversible. Vos données personnelles seront anonymisées et vous serez déconnecté(e). Continuer ?',
    en: 'This action cannot be undone. Your personal data will be anonymised and you will be signed out. Continue?',
  },
  deleteDataConfirmButton:   { fr: 'Oui, supprimer', en: 'Yes, delete' },
  deleteDataCancelButton:    { fr: 'Annuler', en: 'Cancel' },
  deleteDataErrorMsg:        { fr: 'Échec de la suppression des données.', en: 'Failed to delete your data.' },

  // ── Research Dashboard ───────────────────────────────────────
  researchDashboardTitle:    { fr: 'Tableau de bord — Recherche', en: 'Research Dashboard' },
  domainCompletionTitle:     { fr: 'Taux de complétion par domaine', en: 'Completion Rate by Domain' },
  scoreHistoryTitle:         { fr: 'Score moyen dans le temps', en: 'Average Score Over Time' },
  cohortLeaderboardTitle:    { fr: 'Classement de cohorte', en: 'Cohort Leaderboard' },
  leaderboardPanelTitle:     { fr: 'Classement', en: 'Leaderboard' },
  rankLabel:                 { fr: 'Rang', en: 'Rank' },
  playerLabel:               { fr: 'Élève', en: 'Student' },
  cohortLabel:               { fr: 'Cohorte', en: 'Cohort' },
  totalScoreLabel:           { fr: 'Score total', en: 'Total Score' },
  sessionsPlayedLabel:       { fr: 'Parties jouées', en: 'Sessions Played' },
  avgEfficiencyLabel:        { fr: 'Efficacité moy.', en: 'Avg. Efficiency' },
  attemptsLabel:             { fr: 'Tentatives', en: 'Attempts' },
  noDataMsg:                 { fr: 'Aucune donnée disponible.', en: 'No data available.' },
  dashboardErrorMsg:         { fr: 'Impossible de charger le tableau de bord.', en: 'Failed to load the dashboard.' },
  exportCsvButton:           { fr: 'Exporter CSV', en: 'Export CSV' },
  exportCsvErrorMsg:         { fr: 'Échec de l’export CSV.', en: 'Failed to export CSV.' },

  // ── Concept Library ────────────────────────────────────────────
  conceptLinkLabel:        { fr: '💡 En savoir plus sur ce concept :', en: '💡 Learn more about this concept:' },
  conceptLibraryTitle:     { fr: 'Bibliothèque de concepts', en: 'Concept Library' },
  conceptFormulaLabel:     { fr: 'Formule', en: 'Formula' },
  conceptVariablesLabel:   { fr: 'Variables impliquées', en: 'Variables involved' },

  // ── Legal pages — shared ─────────────────────────────────────
  footerPrivacyLink:   { fr: 'Confidentialité', en: 'Privacy Policy' },
  footerTermsLink:     { fr: 'Conditions d\'utilisation', en: 'Terms of Service' },
  legalBackButton:     { fr: '← Retour', en: '← Back' },
  legalLastUpdated:    { fr: 'Dernière mise à jour : juin 2026', en: 'Last updated: June 2026' },

  // ── Privacy Policy ────────────────────────────────────────────
  privacyPolicyTitle:  { fr: 'Politique de confidentialité', en: 'Privacy Policy' },

  privacyS1Title: { fr: 'Données collectées', en: 'Data We Collect' },
  privacyS1Body: {
    fr: 'Lorsque vous utilisez STEM Problem Game, nous collectons :\n\n• Données de jeu : les problèmes tentés, les formules activées, les demandes d\'indice, le temps passé par session, les scores et les chemins d\'activation.\n\n• Identifiant de session anonyme : un UUID généré localement et stocké dans votre navigateur pour relier vos sessions sans nécessiter de compte.\n\n• Données de compte (uniquement si vous créez un compte) : votre adresse e-mail et un nom d\'affichage, gérés via Supabase Auth.\n\n• Informations de plateforme : web, iOS ou Android.',
    en: 'When you use STEM Problem Game, we collect:\n\n• Gameplay data: problems attempted, formulas activated, hint requests, time spent per session, scores, and activation paths.\n\n• Anonymous session identifier: a UUID generated locally and stored in your browser to link sessions without requiring a login.\n\n• Account data (only if you create an account): your email address and a display name, managed securely via Supabase Auth.\n\n• Platform information: web, iOS, or Android.',
  },

  privacyS2Title: { fr: 'Finalités du traitement', en: 'How We Use Your Data' },
  privacyS2Body: {
    fr: 'Vos données sont utilisées pour :\n\n• Personnaliser votre expérience en vous recommandant des problèmes adaptés à votre niveau et à vos domaines de difficulté.\n\n• Alimenter les tableaux de bord des enseignants, permettant aux professeurs de suivre les progrès de la classe.\n\n• Soutenir la recherche pédagogique anonymisée sur l\'apprentissage du raisonnement déductif en STEM.\n\n• Diagnostiquer les problèmes techniques entre plateformes.',
    en: 'Your data is used to:\n\n• Personalise your experience by recommending problems matched to your skill level and areas of difficulty.\n\n• Power instructor dashboards, allowing teachers to track class progress and identify students who may need support.\n\n• Support anonymised educational research into how students learn through deductive reasoning.\n\n• Diagnose technical issues across platforms.',
  },

  privacyS3Title: { fr: 'Services tiers', en: 'Third-Party Services' },
  privacyS3Body: {
    fr: 'Nous utilisons le service tiers suivant :\n\n• Supabase (supabase.com) : fournit l\'authentification et l\'hébergement de la base de données. Supabase traite votre adresse e-mail et vos données de jeu conformément à leur politique de confidentialité.\n\nNous ne partageons pas vos données avec des réseaux publicitaires, des courtiers en données ou d\'autres tiers.',
    en: 'We use the following third-party service:\n\n• Supabase (supabase.com): provides authentication and database hosting. Supabase processes your email address and gameplay data in accordance with their privacy policy.\n\nWe do not share your data with advertising networks, data brokers, or any other third parties.',
  },

  privacyS4Title: { fr: 'Conservation des données', en: 'Data Retention' },
  privacyS4Body: {
    fr: 'Les statistiques de jeu (scores, chemins d\'activation, utilisation des indices) sont conservées pendant la durée de votre utilisation et jusqu\'à 3 ans après votre dernière session, à des fins de recherche.\n\nEn cas de suppression du compte, vos informations personnelles (e-mail, nom d\'affichage) sont effacées. Les statistiques de jeu anonymisées peuvent être conservées à des fins de recherche.\n\nVous pouvez demander la suppression de vos données personnelles à tout moment via Réglages → Supprimer mes données.',
    en: 'Gameplay statistics (scores, activation paths, hint usage) are retained for the duration of your use and for up to 3 years after your last session, for research purposes.\n\nWhen an account is deleted, your personal information (email, display name) is removed. Anonymised gameplay statistics may be retained for research.\n\nYou may request deletion of your personal data at any time via Settings → Delete my data.',
  },

  privacyS5Title: { fr: 'Vos droits (RGPD)', en: 'Your Rights (GDPR)' },
  privacyS5Body: {
    fr: 'Si vous résidez dans l\'Espace économique européen, le RGPD vous confère les droits suivants :\n\n• Accès : demander une copie des données que nous détenons sur vous.\n\n• Rectification : demander la correction de données inexactes.\n\n• Effacement : demander la suppression de vos données personnelles (disponible dans l\'application via Réglages).\n\n• Portabilité : demander vos données de jeu dans un format lisible par machine.\n\n• Opposition : vous opposer au traitement de vos données à des fins de recherche.\n\nPour exercer un droit autre que l\'effacement (disponible directement dans l\'application), contactez-nous à l\'adresse ci-dessous.',
    en: 'If you are located in the European Economic Area, the GDPR grants you the following rights:\n\n• Access: request a copy of the data we hold about you.\n\n• Rectification: request correction of inaccurate data.\n\n• Erasure: request deletion of your personal data (available in-app via Settings).\n\n• Portability: request your gameplay data in a machine-readable format.\n\n• Objection: object to processing of your data for research purposes.\n\nTo exercise any right other than erasure (which is available in-app), please contact us at the address below.',
  },

  privacyS6Title: { fr: 'Contact', en: 'Contact' },
  privacyS6Body: {
    fr: 'Pour toute question relative à la confidentialité ou toute demande concernant vos données personnelles, contactez-nous à : alfawaro86@gmail.com',
    en: 'For privacy questions or personal data requests, contact us at: alfawaro86@gmail.com',
  },

  // ── Terms of Service ──────────────────────────────────────────
  termsTitle:      { fr: 'Conditions d\'utilisation', en: 'Terms of Service' },

  termsS1Title: { fr: 'Acceptation des conditions', en: 'Acceptance of Terms' },
  termsS1Body: {
    fr: 'En utilisant STEM Problem Game, vous acceptez les présentes Conditions d\'utilisation. Si vous n\'êtes pas d\'accord, veuillez ne pas utiliser l\'application. Ces conditions peuvent être mises à jour périodiquement ; la poursuite de l\'utilisation après une mise à jour vaut acceptation.',
    en: 'By using STEM Problem Game, you agree to these Terms of Service. If you do not agree, please do not use the application. These terms may be updated periodically; continued use after an update constitutes acceptance.',
  },

  termsS2Title: { fr: 'Usage éducatif', en: 'Educational Use' },
  termsS2Body: {
    fr: 'STEM Problem Game est conçu pour un usage éducatif — en classe, en groupe de travail ou en apprentissage autonome. L\'application aide les étudiant(e)s à développer des compétences en raisonnement déductif à travers la résolution de problèmes STEM. Toute utilisation à des fins autres qu\'éducatives ou personnelles est exclue.',
    en: 'STEM Problem Game is designed for use in educational settings — classrooms, study groups, and self-directed learning. The application helps students develop deductive reasoning skills through STEM problem solving. Use for any purpose other than education and personal enrichment is not permitted.',
  },

  termsS3Title: { fr: 'Compte utilisateur', en: 'User Account' },
  termsS3Body: {
    fr: 'Un compte n\'est pas nécessaire pour jouer. Si vous en créez un, vous êtes responsable de la sécurité de vos identifiants. Un compte par personne est autorisé. Les comptes présentant des signes d\'accès automatisé ou de malhonnêteté académique peuvent être suspendus.',
    en: 'An account is not required to play. If you create one, you are responsible for maintaining the security of your credentials. One account per person is permitted. Accounts showing signs of automated access or academic dishonesty may be suspended.',
  },

  termsS4Title: { fr: 'Règles d\'utilisation', en: 'Acceptable Use' },
  termsS4Body: {
    fr: 'Vous vous engagez à ne pas :\n\n• Tenter de décompiler, scraper ou extraire les données de problèmes en masse.\n\n• Perturber ou tenter d\'interrompre le service.\n\n• Partager vos identifiants de compte.\n\n• Utiliser l\'application d\'une manière susceptible de nuire à d\'autres utilisateurs ou à l\'intégrité pédagogique de la plateforme.',
    en: 'You agree not to:\n\n• Attempt to reverse-engineer, scrape, or extract problem data in bulk.\n\n• Interfere with or attempt to disrupt the service.\n\n• Share account credentials with others.\n\n• Use the application in a manner that could harm other users or the educational integrity of the platform.',
  },

  termsS5Title: { fr: 'Propriété intellectuelle', en: 'Intellectual Property' },
  termsS5Body: {
    fr: 'Le contenu des problèmes, les logiciels et les éléments graphiques sont la propriété des auteurs de l\'application. Les problèmes créés via l\'Éditeur de problèmes et soumis à la plateforme peuvent être utilisés par les enseignants et les étudiant(e)s au sein de la même institution. Vous conservez la propriété des problèmes que vous créez, mais accordez une licence d\'affichage au sein de la plateforme.',
    en: 'All problem content, software, and graphical elements are the property of the application authors. Problems created through the Problem Editor and submitted to the platform may be used by instructors and students within the same institution. You retain ownership of problems you create, but grant a licence to display them within the platform.',
  },

  termsS6Title: { fr: 'Limitation de responsabilité', en: 'Disclaimer' },
  termsS6Body: {
    fr: 'STEM Problem Game est fourni "tel quel" à des fins éducatives. Nous ne garantissons pas l\'exactitude du contenu des problèmes ni la disponibilité ininterrompue du service. Nous déclinons toute responsabilité pour toute perte de progression ou de données résultant de défaillances techniques.',
    en: 'STEM Problem Game is provided "as is" for educational purposes. We make no guarantees about the accuracy of problem content or uninterrupted availability of the service. We are not liable for any loss of progress or data resulting from technical failures.',
  },

  termsS7Title: { fr: 'Modifications des conditions', en: 'Changes to These Terms' },
  termsS7Body: {
    fr: 'Nous pouvons mettre à jour ces Conditions à tout moment. Les utilisateurs disposant d\'un compte enregistré seront notifiés par e-mail des modifications importantes. Votre utilisation continue de l\'application après la date d\'entrée en vigueur des nouvelles conditions vaut acceptation de celles-ci.',
    en: 'We may update these Terms at any time. Users with a registered account will be notified by email of significant changes. Your continued use of the application after the effective date of the revised Terms constitutes your acceptance.',
  },

  // ── Research Dashboard — trend metrics (GDD §8.3) ─────────────
  stepEfficiencyTrendTitle:     { fr: 'Ratio d\'efficacité des étapes (tendance)', en: 'Step Efficiency Ratio (trend)' },
  hintDecayTrendTitle:          { fr: 'Taux de décroissance des indices (tendance)', en: 'Hint Decay Rate (trend)' },
  domainCompletionTrendTitle:   { fr: 'Taux de complétion (tendance)', en: 'Domain Completion Rate (trend)' },
  cascadeRecognitionTrendTitle: { fr: 'Vitesse de reconnaissance des cascades — Δt (tendance)', en: 'Cascade Recognition Speed — Δt (trend)' },
  scoreTrajectoryTrendTitle:    { fr: 'Trajectoire du score (tendance)', en: 'Score Trajectory (trend)' },
  stuckRateTrendTitle:          { fr: 'Taux de blocage (tendance)', en: 'Stuck Rate (trend)' },
  byStudentLabel:               { fr: 'Par élève', en: 'By student' },
  byCohortLabel:                { fr: 'Par cohorte', en: 'By cohort' },
} as const;

/** Get a translated string by key and language. */
export function t(key: keyof typeof UI, lang: Lang): string {
  const entry = UI[key];
  if (typeof entry === 'object' && 'fr' in entry && typeof entry.fr === 'string') {
    return entry[lang] as string;
  }
  return key;
}

/** Substitute `{0}`, `{1}`, ... placeholders in a translated string with the given values. */
export function format(template: string, ...args: ReadonlyArray<string | number>): string {
  return template.replace(/\{(\d+)\}/g, (match, index: string) => {
    const value = args[Number(index)];
    return value === undefined ? match : String(value);
  });
}

/** Get a translated function (for strings with parameters). */
export function tf(
  key: keyof typeof UI,
  lang: Lang
): ((...args: number[]) => string) {
  const entry = UI[key];
  if (typeof entry === 'object' && lang in entry && typeof (entry as Record<string, unknown>)[lang] === 'function') {
    return (entry as Record<string, (...args: number[]) => string>)[lang]!;
  }
  return () => key;
}

const DOMAIN_KEYS: Record<Domain, keyof typeof UI> = {
  physics: 'domainPhysics',
  chemistry: 'domainChemistry',
  mathematics: 'domainMathematics',
  biology: 'domainBiology',
  engineering: 'domainEngineering',
};

/** Get the translated display name for a STEM domain. */
export function domainLabel(domain: Domain, lang: Lang): string {
  return t(DOMAIN_KEYS[domain], lang);
}

const DIFFICULTY_KEYS: Record<Difficulty, keyof typeof UI> = {
  beginner: 'difficultyBeginner',
  intermediate: 'difficultyIntermediate',
  advanced: 'difficultyAdvanced',
  expert: 'difficultyExpert',
};

/** Get the translated display name for a difficulty level. */
export function difficultyLabel(difficulty: Difficulty, lang: Lang): string {
  return t(DIFFICULTY_KEYS[difficulty], lang);
}
