import React, { createContext, useState, useContext } from 'react';

export const translations = {
  en: {
    // Login
    welcomeBack: 'Welcome Back',
    loginSubtitle: 'Login to your account',
    email: 'Email',
    password: 'Password',
    login: 'Login',
    noAccount: "I don't have an account",
    forgotPassword: 'Forgot Password?',
    emailSent: 'Email Sent',
    emailSentMsg: 'A password reset link has been sent to your email address.',
    enterEmail: 'Attention',
    enterEmailMsg: 'Please enter your email address first to receive a reset link.',
    userNotFound: "User doesn't exist",
    incorrectLogin: 'Incorrect email or password',
    enterBoth: 'Enter email and password',
    error: 'Error',

    // SignUp
    welcomeToPlannify: 'Welcome to Plannify',
    createAccount: 'Create Account',
    alreadyHaveAccount: 'Already have an account?',
    homeroomTeacher: 'Homeroom Teacher',
    mobileNumber: 'Mobile Number',

    // Profile
    profile: 'Profile',
    profileSubtitle: 'Manage your account details',
    username: 'Username',
    name: 'Name',
    school: 'School',
    grade: 'Grade',
    teacher: 'Homeroom Teacher (Optional)',
    mobile: 'Mobile Number',
    saveChanges: 'Save Changes',
    profileUpdated: 'Profile updated',
    language: 'Language',

    // Dashboard
    todaysClasses: "Today's Classes",
    classesToday: 'classes today',
    total: 'Total',
    noClasses: 'No classes scheduled for today',
    homework: 'Homework',
    pendingTasks: 'pending tasks',
    noHomework: 'No homework left 🎉',
    profileCard: 'Profile',
    enterAccount: 'Enter Account',

    // Timetable
    timetable: 'Timetable',
    addYourSubjects: 'Add your Subjects',
    noSubjects: 'No subjects for',
    addSubject: '+ Add Subject',
    createSubject: 'Create a Subject',
    start: 'Start',
    end: 'End',
    subject: 'Subject',
    description: 'Description',
    saveSubject: 'Save Subject',
    subjectRequired: 'Subject required',
    subjectRequiredMsg: 'Please enter a subject before saving',
    invalidTime: 'Invalid time',
    sameTime: 'Start time and end time cannot be the same.',
    endBeforeStart: 'End time cannot be less than start time.',
    timeConflict: 'Time conflict',
    timeConflictMsg: 'You already have a subject scheduled on',
    duringThisTime: 'during this time.',
    subjectUploaded: 'Subject uploaded.',

    // Homework Screen
    trackTasks: 'Track your tasks',
    addHomework: '+ Add Homework',
    newHomework: 'New Homework',
    selectDueDate: 'Select Due Date',
    saveHomework: 'Save Homework',
    homeworkSaved: 'Homework saved.',
    due: 'Due',
    notStarted: 'Not started',
    inProgress: 'In Progress',
    done: 'Done',
    homeworkCompleted: 'Homework completed',
    removeHomework: 'Remove this homework?',
    cancel: 'Cancel',
    delete: 'Delete',
  },
  de: {
    // Login
    welcomeBack: 'Willkommen zurück',
    loginSubtitle: 'Melde dich an',
    email: 'E-Mail',
    password: 'Passwort',
    login: 'Anmelden',
    noAccount: 'Ich habe noch kein Konto',
    forgotPassword: 'Passwort vergessen?',
    emailSent: 'E-Mail gesendet',
    emailSentMsg: 'Ein Link zum Zurücksetzen wurde an deine E-Mail gesendet.',
    enterEmail: 'Achtung',
    enterEmailMsg: 'Bitte gib zuerst deine E-Mail-Adresse ein.',
    userNotFound: 'Benutzer nicht gefunden',
    incorrectLogin: 'Falsche E-Mail oder falsches Passwort',
    enterBoth: 'E-Mail und Passwort eingeben',
    error: 'Fehler',

    // SignUp
    welcomeToPlannify: 'Willkommen bei Plannify',
    createAccount: 'Konto erstellen',
    alreadyHaveAccount: 'Ich habe bereits ein Konto',
    homeroomTeacher: 'Klassenlehrer',
    mobileNumber: 'Handynummer',

    // Profile
    profile: 'Profil',
    profileSubtitle: 'Kontodaten verwalten',
    username: 'Benutzername',
    name: 'Name',
    school: 'Schule',
    grade: 'Klasse',
    teacher: 'Klassenlehrer (Optional)',
    mobile: 'Handynummer',
    saveChanges: 'Änderungen speichern',
    profileUpdated: 'Profil aktualisiert',
    language: 'Sprache',

    // Dashboard
    todaysClasses: 'Heutige Stunden',
    classesToday: 'Stunden heute',
    total: 'Gesamt',
    noClasses: 'Heute keine Stunden',
    homework: 'Hausaufgaben',
    pendingTasks: 'offene Aufgaben',
    noHomework: 'Keine Hausaufgaben 🎉',
    profileCard: 'Profil',
    enterAccount: 'Konto öffnen',

    // Timetable
    timetable: 'Stundenplan',
    addYourSubjects: 'Fächer hinzufügen',
    noSubjects: 'Keine Fächer für',
    addSubject: '+ Fach hinzufügen',
    createSubject: 'Fach erstellen',
    start: 'Start',
    end: 'Ende',
    subject: 'Fach',
    description: 'Beschreibung',
    saveSubject: 'Fach speichern',
    subjectRequired: 'Fach erforderlich',
    subjectRequiredMsg: 'Bitte gib ein Fach ein, bevor du speicherst.',
    invalidTime: 'Ungültige Zeit',
    sameTime: 'Start- und Endzeit dürfen nicht gleich sein.',
    endBeforeStart: 'Die Endzeit darf nicht vor der Startzeit liegen.',
    timeConflict: 'Zeitkonflikt',
    timeConflictMsg: 'Du hast bereits ein Fach am',
    duringThisTime: 'zu dieser Zeit.',
    subjectUploaded: 'Fach gespeichert.',

    // Homework Screen
    trackTasks: 'Aufgaben verfolgen',
    addHomework: '+ Hausaufgabe hinzufügen',
    newHomework: 'Neue Hausaufgabe',
    selectDueDate: 'Fälligkeitsdatum wählen',
    saveHomework: 'Hausaufgabe speichern',
    homeworkSaved: 'Hausaufgabe gespeichert.',
    due: 'Fällig',
    notStarted: 'Nicht begonnen',
    inProgress: 'In Bearbeitung',
    done: 'Fertig',
    homeworkCompleted: 'Hausaufgabe erledigt',
    removeHomework: 'Diese Hausaufgabe entfernen?',
    cancel: 'Abbrechen',
    delete: 'Löschen',
  },
};

export const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const t = translations[language];
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}