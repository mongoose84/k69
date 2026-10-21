-- Loggen fik struktur: hvad der skete, ligger i data (DomaeneHaendelse). Teksten
-- laves af klienten, så den er kun med for linjer fra før.
alter table haendelser alter column tekst drop not null;
