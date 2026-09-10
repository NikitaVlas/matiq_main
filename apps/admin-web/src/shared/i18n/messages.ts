// Source phrases are stable UI keys. Editorial content is never passed here.
const rows = `
published videos|veröffentlichte Videos|опубликованных видео
published|veröffentlicht|опубликовано
draft|Entwurf|черновик
(draft)|(Entwurf)|(черновик)
Create|Erstellen|Создать
Veröffentlicht|Veröffentlicht|Опубликовано
Entwurf|Entwurf|Черновик
ja|ja|да
nein|nein|нет
Umsatzsteuer|Umsatzsteuer|НДС
Erstattungen|Erstattungen|Возвраты
Chargebacks|Rückbuchungen|Возвраты по спорам
PSP-Gebühren|PSP-Gebühren|Комиссии провайдера
Add at least one lesson before publishing.|Füge vor der Veröffentlichung mindestens eine Lektion hinzu.|Перед публикацией добавьте хотя бы один урок.
Lesson "{0}" has more than one primary path.|Lektion „{0}“ hat mehr als einen Hauptpfad.|У урока «{0}» несколько основных переходов.
Lesson "{0}" links outside this course.|Lektion „{0}“ verweist auf ein Ziel außerhalb des Kurses.|Урок «{0}» ссылается на урок вне курса.
Lesson paths contain a cycle.|Die Lernpfade enthalten einen Kreis.|В связях уроков обнаружен цикл.
Courses|Kurse|Курсы
Videos|Videos|Видео
Assessment|Assessment|Оценка навыков
Assessment management|Assessment verwalten|Управление оценкой навыков
Assessment data could not be loaded.|Assessment-Daten konnten nicht geladen werden.|Не удалось загрузить данные оценки.
Saving...|Wird gespeichert …|Сохранение…
Saved.|Gespeichert.|Сохранено.
Save failed.|Speichern fehlgeschlagen.|Не удалось сохранить.
Save failed (HTTP {0}): {1}|Speichern fehlgeschlagen (HTTP {0}).|Не удалось сохранить (HTTP {0}).
Confidence finds gaps, Preference builds the core game, and Goal adds areas to explore.|Selbsteinschätzung zeigt Lücken, Vorlieben bilden das eigene Spiel und Ziele ergänzen neue Bereiche.|Самооценка выявляет пробелы, предпочтения формируют основу, а цели добавляют новые направления.
Create question|Frage erstellen|Создать вопрос
Existing questions|Vorhandene Fragen|Существующие вопросы
Answers waiting for mapping|Antworten ohne Themenzuordnung|Ответы без привязки к теме
They do not influence a Roadmap until an administrator assigns a topic key.|Sie beeinflussen die Roadmap erst nach der Themenzuordnung durch einen Administrator.|Они не влияют на план развития, пока администратор не назначит тему.
No unmapped answers.|Keine Antworten ohne Zuordnung.|Нет ответов без привязки.
Topic for {0}|Thema für {0}|Тема для {0}
Select Roadmap topic|Roadmap-Thema auswählen|Выберите тему плана
Map answer|Antwort zuordnen|Привязать ответ
Active|Aktiv|Активно
Save question|Frage speichern|Сохранить вопрос
Question definition|Fragendefinition|Настройки вопроса
Stable key|Stabiler Schlüssel|Постоянный ключ
Athlete-facing question|Frage für den Athleten (Deutsch)|Вопрос для спортсмена (на немецком)
Purpose|Zweck|Назначение
Confidence / gap|Selbsteinschätzung / Lücke|Самооценка / пробелы
Preferred game / core|Bevorzugtes Spiel / Kern|Предпочтения / основа
Goal / explore|Ziel / Entdecken|Цели / изучение
Context|Kontext|Контекст
Standing|Stand|Стойка
Top|Oben|Сверху
Bottom|Unten|Снизу
Roadmap topic measured by this question|Durch diese Frage bewertetes Roadmap-Thema|Тема плана, оцениваемая вопросом
Select topic|Thema auswählen|Выберите тему
Multiple choices|Mehrfachauswahl|Несколько вариантов
Allow custom unmapped answer|Freie Antwort ohne Zuordnung erlauben|Разрешить свободный ответ без привязки
Answer options|Antwortmöglichkeiten|Варианты ответа
Answer shown to the athlete|Antwort für den Athleten (Deutsch)|Ответ для спортсмена (на немецком)
Internal key:|Interner Schlüssel:|Внутренний ключ:
generated automatically|automatisch erzeugt|создаётся автоматически
score|Bewertung|Оценка
Core|Kern|Основа
Gap|Lücke|Пробел
Explore|Entdecken|Изучение
Remove|Entfernen|Удалить
Add option|Antwort hinzufügen|Добавить вариант
Validation report for {0}|Prüfbericht für {0}|Результат проверки: {0}
Course is ready to publish.|Der Kurs kann veröffentlicht werden.|Курс готов к публикации.
Course cannot be published yet:|Der Kurs kann noch nicht veröffentlicht werden:|Курс пока нельзя опубликовать:
Content data could not be loaded.|Inhalte konnten nicht geladen werden.|Не удалось загрузить материалы.
Operation failed (HTTP {0}){1}|Aktion fehlgeschlagen (HTTP {0}).|Действие не выполнено (HTTP {0}).
This also deletes every module, lesson, and lesson path in the course.|Alle Module, Lektionen und Lernpfade des Kurses werden ebenfalls gelöscht.|Также будут удалены все модули, уроки и связи уроков курса.
This also deletes every lesson and lesson path in the module.|Alle Lektionen und Lernpfade des Moduls werden ebenfalls gelöscht.|Также будут удалены все уроки и связи уроков модуля.
Its video is kept and becomes available for another lesson.|Das Video bleibt erhalten und kann einer anderen Lektion zugeordnet werden.|Видео сохранится и станет доступно для другого урока.
Delete {0} "{1}"? {2}|{0} „{1}“ löschen? {2}|Удалить {0} «{1}»? {2}
course|Kurs|курс
module|Modul|модуль
lesson|Lektion|урок
Course publishing failed (HTTP {0}).|Kursveröffentlichung fehlgeschlagen (HTTP {0}).|Не удалось опубликовать курс (HTTP {0}).
Course validation failed (HTTP {0}).|Kursprüfung fehlgeschlagen (HTTP {0}).|Не удалось проверить курс (HTTP {0}).
Course creation failed (HTTP {0}){1}|Kurserstellung fehlgeschlagen (HTTP {0}).|Не удалось создать курс (HTTP {0}).
Upload video|Video hochladen|Загрузить видео
Foundation Roadmap|Grundlagen-Roadmap|Базовый план
MATIQ Content Builder|MATIQ Inhaltseditor|Редактор контента MATIQ
Course title|Kurstitel (Deutsch)|Название курса (на немецком)
Create course|Kurs erstellen|Создать курс
Close course editor|Kurseditor schließen|Закрыть редактор курса
Open course editor|Kurseditor öffnen|Открыть редактор курса
Publish updates|Änderungen veröffentlichen|Опубликовать изменения
Publish course|Kurs veröffentlichen|Опубликовать курс
Validate course|Kurs prüfen|Проверить курс
Edit course|Kurs bearbeiten|Изменить курс
Delete course|Kurs löschen|Удалить курс
Course title to edit|Kurstitel bearbeiten|Изменить название курса
Save course|Kurs speichern|Сохранить курс
Cancel|Abbrechen|Отмена
New module|Neues Modul|Новый модуль
Add module|Modul hinzufügen|Добавить модуль
Move module up|Modul nach oben|Модуль вверх
Move module down|Modul nach unten|Модуль вниз
Edit module|Modul bearbeiten|Изменить модуль
Delete module|Modul löschen|Удалить модуль
Module title to edit|Modultitel bearbeiten|Изменить название модуля
Save module|Modul speichern|Сохранить модуль
Publish lesson|Lektion veröffentlichen|Опубликовать урок
Move lesson up|Lektion nach oben|Урок вверх
Move lesson down|Lektion nach unten|Урок вниз
Edit lesson|Lektion bearbeiten|Изменить урок
Delete lesson|Lektion löschen|Удалить урок
Add lesson path|Lernpfad hinzufügen|Добавить связь уроков
lesson paths)|Lernpfade)|связей уроков)
Primary path|Hauptpfad|Основной переход
Conditional path|Bedingter Pfad|Условный переход
Edit path|Pfad bearbeiten|Изменить связь
Delete path to "{0}"?|Pfad zu „{0}“ löschen?|Удалить переход к «{0}»?
Delete path|Pfad löschen|Удалить связь
Lesson title to edit|Lektionstitel bearbeiten|Изменить название урока
Save lesson|Lektion speichern|Сохранить урок
Select a target lesson.|Bitte eine Ziellektion auswählen.|Выберите следующий урок.
a path from "|einen Pfad von „|связь из «
1. Target lesson — where should the athlete continue?|1. Ziellektion – wo geht es weiter?|1. Следующий урок — куда перейти спортсмену?
Target lesson|Ziellektion|Следующий урок
Select target lesson|Ziellektion auswählen|Выберите следующий урок
2. Path type|2. Pfadtyp|2. Тип перехода
Path type|Pfadtyp|Тип перехода
Primary path — normal continuation|Hauptpfad – normale Fortsetzung|Основной переход — обычное продолжение
Conditional path — situation dependent|Bedingter Pfad – abhängig von der Situation|Условный переход — по ситуации
Paths are optional because every lesson can be opened independently. Use at most one primary path when you want to suggest a normal next lesson. Use conditional paths when the suggestion depends on an opponent reaction or another situation.|Pfade sind optional: Jede Lektion ist einzeln zugänglich. Verwende höchstens einen Hauptpfad für die normale Fortsetzung und bedingte Pfade für bestimmte Reaktionen oder Situationen.|Связи необязательны: каждый урок доступен отдельно. Используйте не более одного основного перехода; условные переходы зависят от реакции соперника или ситуации.
3. Branch trigger — when should this path be shown?|3. Auslöser – wann wird der Pfad angezeigt?|3. Условие — когда показывать переход?
Branch trigger|Auslöser|Условие перехода
New branch trigger|Neuer Auslöser|Новое условие
New trigger, for example Opponent sprawls|Neuer Auslöser, z. B. Gegner macht einen Sprawl|Новое условие, например спролл соперника
Trigger creation failed (HTTP {0}).|Auslöser konnte nicht erstellt werden (HTTP {0}).|Не удалось создать условие (HTTP {0}).
Add new trigger|Auslöser hinzufügen|Добавить условие
Save lesson path|Lernpfad speichern|Сохранить связь
Create lesson path|Lernpfad erstellen|Создать связь
Select an unused published video for this lesson.|Wähle ein veröffentlichtes, noch nicht zugeordnetes Video.|Выберите опубликованное видео, не привязанное к уроку.
Lesson title|Lektionstitel (Deutsch)|Название урока (на немецком)
Published video|Veröffentlichtes Video|Опубликованное видео
Select an unused published video|Freies veröffentlichtes Video auswählen|Выберите свободное опубликованное видео
Adding lesson...|Lektion wird hinzugefügt …|Добавление урока…
Add lesson|Lektion hinzufügen|Добавить урок
All published videos are already assigned. Upload and publish another video before adding a lesson.|Alle veröffentlichten Videos sind bereits zugeordnet. Lade zuerst ein weiteres Video hoch und veröffentliche es.|Все опубликованные видео уже привязаны. Загрузите и опубликуйте новое видео перед добавлением урока.
Foundation data could not be loaded.|Grundlagendaten konnten nicht geladen werden.|Не удалось загрузить базовый план.
Step added.|Schritt hinzugefügt.|Шаг добавлен.
Add failed.|Hinzufügen fehlgeschlagen.|Не удалось добавить.
← Content administration|← Inhaltsverwaltung|← Управление контентом
Beginner Foundation Roadmap|Grundlagen-Roadmap für Einsteiger|Базовый план для новичков
Ordered fundamentals assigned to white belts with no more than six months of experience.|Geordnete Grundlagen für Weißgurte mit höchstens sechs Monaten Erfahrung.|Последовательность основ для белых поясов с опытом не более шести месяцев.
Eligibility:|Voraussetzung:|Условия:
months|Monate|месяцев
Order|Reihenfolge|Порядок
Step title|Schritttitel|Название шага
Roadmap topic|Roadmap-Thema|Тема плана
Status|Status|Статус
Action|Aktion|Действие
{0} position|Position: {0}|Порядок: {0}
{0} title|Titel: {0}|Название: {0}
{0} topic|Thema: {0}|Тема: {0}
Save|Speichern|Сохранить
Add step|Schritt hinzufügen|Добавить шаг
For example: Closed Guard basics|Zum Beispiel: Grundlagen der Closed Guard|Например: основы закрытого гарда
Select what this step teaches|Lerninhalt dieses Schritts auswählen|Выберите тему этого шага
published videos)|veröffentlichte Videos)|опубликованных видео)
The Roadmap topic connects this step to matching courses and published videos.|Das Roadmap-Thema verbindet diesen Schritt mit passenden Kursen und veröffentlichten Videos.|Тема связывает шаг с подходящими курсами и опубликованными видео.
Training focus (optional)|Trainingsschwerpunkt (optional)|Акцент тренировки (необязательно)
Explain what the athlete should understand or practise in this step.|Beschreibe, was der Athlet in diesem Schritt verstehen oder üben soll.|Опишите, что спортсмен должен понять или отработать на этом шаге.
Add foundation step|Grundlagenschritt hinzufügen|Добавить базовый шаг
Rename the file using Latin characters before uploading.|Benenne die Datei vor dem Hochladen mit lateinischen Zeichen um.|Перед загрузкой переименуйте файл латинскими буквами.
Uploading...|Wird hochgeladen …|Загрузка…
Video created: {0}|Video erstellt: {0}|Видео создано: {0}
Upload failed ({0})|Hochladen fehlgeschlagen ({0})|Ошибка загрузки ({0})
Upload request failed|Hochladen fehlgeschlagen|Не удалось загрузить файл
Metadata option creation failed ({0})|Metadatenwert konnte nicht erstellt werden ({0})|Не удалось создать значение метаданных ({0})
Metadata field creation failed ({0})|Metadatenfeld konnte nicht erstellt werden ({0})|Не удалось создать поле метаданных ({0})
Use a Roadmap topic name that contains Latin letters or numbers.|Der Themenname muss lateinische Buchstaben oder Ziffern enthalten.|Название темы должно содержать латинские буквы или цифры.
This Roadmap topic already exists.|Dieses Roadmap-Thema existiert bereits.|Эта тема плана уже существует.
Roadmap topic creation failed ({0})|Roadmap-Thema konnte nicht erstellt werden ({0})|Не удалось создать тему плана ({0})
Roadmap topic added. It is now available for video metadata.|Roadmap-Thema hinzugefügt. Es ist jetzt in den Video-Metadaten verfügbar.|Тема добавлена и доступна в метаданных видео.
Metadata save failed ({0})|Metadaten konnten nicht gespeichert werden ({0})|Не удалось сохранить метаданные ({0})
Metadata saved.|Metadaten gespeichert.|Метаданные сохранены.
Upload local video|Lokales Video hochladen|Загрузить видео с компьютера
Use a Latin filename. Metadata fields and values can be expanded at any time.|Verwende einen lateinischen Dateinamen. Metadatenfelder und Werte können jederzeit ergänzt werden.|Используйте имя файла латиницей. Поля и значения метаданных можно дополнять.
Metadata fields|Metadatenfelder|Поля метаданных
Metadata fields describe videos and make them easier to filter and recommend. Examples: Discipline, Skill level, Position, Technique, or Content focus. Add a field only when the required category does not already exist; its selectable values are added while editing a video.|Metadaten beschreiben Videos für Filter und Empfehlungen, etwa Disziplin, Niveau, Position oder Technik. Lege nur fehlende Kategorien an; Werte ergänzt du bei der Videobearbeitung.|Метаданные описывают видео для фильтров и рекомендаций: дисциплина, уровень, позиция, техника. Добавляйте только отсутствующие категории; значения добавляются при редактировании видео.
New metadata category|Neue Metadatenkategorie|Новая категория метаданных
New category, for example Coach|Neue Kategorie, z. B. Trainer|Новая категория, например тренер
Add field|Feld hinzufügen|Добавить поле
Roadmap content coverage|Inhaltsabdeckung der Roadmap|Покрытие плана материалами
Roadmap topics connect Assessment recommendations with published videos and courses. A topic without coverage remains visible to athletes but cannot recommend a lesson yet.|Roadmap-Themen verbinden Empfehlungen mit veröffentlichten Videos und Kursen. Themen ohne Inhalte bleiben sichtbar, können aber noch keine Lektion empfehlen.|Темы связывают рекомендации с опубликованными видео и курсами. Тема без материалов видна спортсмену, но пока не может рекомендовать урок.
New Roadmap topic|Neues Roadmap-Thema|Новая тема плана
For example Half Guard|Zum Beispiel Half Guard|Например Half Guard
Add Roadmap topic|Roadmap-Thema hinzufügen|Добавить тему плана
published video|veröffentlichtes Video|опубликованных видео
— needs content|— Inhalte fehlen|— нужны материалы
No Roadmap topics available.|Keine Roadmap-Themen vorhanden.|Тем плана пока нет.
Roadmap diagnostics|Roadmap-Prüfung|Диагностика плана
Warnings|Hinweise|Предупреждения
: no published content|: keine veröffentlichten Inhalte|: нет опубликованных материалов
 ({0} draft)| ({0} Entwürfe)| (черновиков: {0})
: not used by Assessment|: nicht im Assessment verwendet|: не используется в оценке
: published without a Roadmap topic|: ohne Roadmap-Thema veröffentlicht|: опубликовано без темы плана
No Roadmap connection warnings.|Keine Hinweise zu Roadmap-Verknüpfungen.|Нет предупреждений о связях плана.
Copy ID|ID kopieren|Скопировать ID
Publish|Veröffentlichen|Опубликовать
Edit metadata|Metadaten bearbeiten|Изменить метаданные
Roadmap connection:|Roadmap-Verknüpfung:|Связь с планом:
select the Assessment topic this video teaches. Use Add new option only for an approved methodology topic.|Wähle das Assessment-Thema des Videos. Neue Werte nur für freigegebene Methodikthemen anlegen.|Выберите тему оценки, которой обучает видео. Добавляйте значения только для утверждённых тем методологии.
Completion role:|Rolle für den Abschluss:|Роль в завершении:
Required videos must all be completed; Recommended and Optional videos do not block the Roadmap step.|Alle Pflichtvideos müssen angesehen werden. Empfohlene und optionale Videos blockieren den Schritt nicht.|Обязательные видео нужно просмотреть все. Рекомендуемые и дополнительные не блокируют завершение шага.
Not selected|Nicht ausgewählt|Не выбрано
Add value to {0}|Wert zu {0} hinzufügen|Добавить значение: {0}
Add new option|Neuen Wert hinzufügen|Добавить значение
Save metadata|Metadaten speichern|Сохранить метаданные
Edit|Bearbeiten|Изменить
Add|Hinzufügen|Добавить
Standalone|Einzelvideo|Отдельное видео
Paid|Bezahlt|Платные просмотры
Trial|Testphase|Пробный период
Video|Video|Видео
Kurs|Kurs|Курс
users|Benutzer|Пользователи
trainers|Trainer|Тренеры
videos|Videos|Видео
activeAssessmentQuestions|Aktive Assessment-Fragen|Активные вопросы оценки
DRAFT|Entwurf|Черновик
ACTIVE|Aktiv|Активно
REVIEWED|Geprüft|Проверено
APPROVED|Freigegeben|Утверждено
PAID|Bezahlt|Оплачено
ARCHIVED|Archiviert|В архиве
REQUIRED|Pflicht|Обязательно
RECOMMENDED|Empfohlen|Рекомендуется
OPTIONAL|Optional|Дополнительно
BJJ_GI|BJJ Gi|BJJ Gi
NO_GI_GRAPPLING|No-Gi Grappling|No-Gi Grappling
`;

const germanRussian = `
Anmeldung fehlgeschlagen|Не удалось войти
MFA-Einrichtung konnte nicht gestartet werden|Не удалось начать настройку MFA
Admin API ist nicht erreichbar. Bitte Port 4001 prüfen.|Сервис администрирования недоступен. Повторите попытку позже.
Administratorzugriff fehlgeschlagen|Нет доступа к администрированию
Wiedergabestatistik nicht verfügbar|Статистика просмотров недоступна
GDPR-Betriebsstatus nicht verfügbar|Статус операций GDPR недоступен
Die Anmeldung hat länger als 10 Sekunden gedauert. User API oder Datenbank prüfen.|Вход занял больше 10 секунд. Повторите попытку позже.
User API ist nicht erreichbar.|Сервис пользователей недоступен.
Bitte RETRY zur Bestätigung eingeben.|Для подтверждения введите RETRY.
Wiederholung konnte nicht gestartet werden|Не удалось запустить повторную обработку
{0} wartende und {1} fehlgeschlagene Vorgänge freigegeben.|Возобновлено ожидающих операций: {0}, неудачных: {1}.
Admin API ist nicht erreichbar. Wiederholung wurde nicht bestätigt.|Сервис недоступен. Повторная обработка не подтверждена.
Bitte den sechsstelligen Code aus der Authenticator-App eingeben.|Введите шестизначный код из приложения-аутентификатора.
Der MFA-Code ist ungültig|Неверный код MFA
MFA ist aktiviert. Bitte erneut mit dem MFA-Code anmelden.|MFA включена. Войдите снова с кодом MFA.
Die MFA-Bestätigung hat länger als 10 Sekunden gedauert.|Подтверждение MFA заняло больше 10 секунд.
MATIQ ADMIN|MATIQ ADMIN
Redaktion und Verwaltung|Редакция и управление
Redaktion für MATIQ-Inhalte und Assessment-Regeln.|Управление материалами MATIQ и правилами оценки.
E-Mail|Электронная почта
Passwort|Пароль
MFA-Code|Код MFA
Bitte warten…|Подождите…
Dashboard laden|Открыть панель
Füge diesen geheimen Schlüssel in deine Authenticator-App ein:|Добавьте этот секретный ключ в приложение-аутентификатор:
Bestätigungscode|Код подтверждения
Sechsstelliger Code aus der Authenticator-App|Шестизначный код из приложения-аутентификатора
MFA aktivieren|Включить MFA
GDPR-Betriebsstatus|Состояние операций GDPR
Nur aggregierte technische Zustände, ohne Personen- oder Zahlungsdaten.|Только сводные технические состояния, без персональных и платёжных данных.
Geplante Löschungen|Запланированные удаления
Fällige Zeitpläne|Наступившие сроки
Löschung ausstehend|Ожидает удаления
Outbox ausstehend|Ожидает отправки
Verarbeitung festgefahren|Обработка зависла
Fehlgeschlagene Inbox|Ошибки обработки
Dead Letter|Необработанные сообщения
Verlängerung ausstehend|Ожидает продления
Manuelle Prüfung|Ручная проверка
Ältester Vorgang|Самая давняя операция
Sekunden|секунд
Bestätigung: RETRY|Подтверждение: RETRY
Sichere Wiederholung starten|Безопасно повторить обработку
Wiedergabestatistik wird geladen…|Загрузка статистики просмотров…
Trainer konnten nicht geladen werden.|Не удалось загрузить тренеров.
Entwurf gespeichert.|Черновик сохранён.
Profil konnte nicht gespeichert werden.|Не удалось сохранить профиль.
Publikationsstatus aktualisiert.|Статус публикации обновлён.
Aktion nicht erlaubt.|Действие не разрешено.
Autorenzuordnung aktualisiert.|Привязка автора обновлена.
Zuordnung fehlgeschlagen.|Не удалось сохранить привязку.
MATIQ Redaktion|Редакция MATIQ
Sportlerprofile der Trainer|Спортивные профили тренеров
Hier wird die Geschichte des Autors gepflegt. Upload und Veröffentlichung der Inhalte bleiben bei MATIQ.|Здесь редактируется история автора. Загрузка и публикация материалов выполняются MATIQ.
Trainer|Тренер
Kurse ·|Курсы ·
Videos ·|Видео ·
Anzeigename|Отображаемое имя
Slug|Адрес страницы (slug)
Foto-URL|Ссылка на фото
Biografie|Биография
Weg als Athlet|Спортивный путь
Wettkampferfahrung und Analysen|Соревновательный опыт и разборы
Trainingsprinzipien|Принципы тренировок
Stadt|Город
Lokale Verfügbarkeit|Доступность в регионе
Qualifikationen|Квалификация
Meilensteine|Достижения
Sprachen|Языки
Disziplinen|Дисциплины
Entwurf speichern|Сохранить черновик
Veröffentlichung zurückziehen|Снять с публикации
Profil veröffentlichen|Опубликовать профиль
Kurse dieses Athleten|Курсы этого спортсмена
Videos dieses Athleten|Видео этого спортсмена
Es gibt noch keinen Benutzer mit der Rolle Trainer.|Пользователей с ролью тренера пока нет.
Noch keine Inhalte vorhanden.|Материалов пока нет.
{0} (durch Komma getrennt)|{0} (через запятую)
Finanzdaten konnten nicht geladen werden.|Не удалось загрузить финансовые данные.
Bitte bestätige zuerst dein Admin-Passwort.|Сначала подтвердите пароль администратора.
Aktion fehlgeschlagen. Bitte Eingaben und Status prüfen.|Не удалось выполнить действие. Проверьте данные и статус.
Finanzdaten wurden aktualisiert.|Финансовые данные обновлены.
Passwortbestätigung fehlgeschlagen.|Не удалось подтвердить пароль.
Kritische Finanzaktionen sind für 15 Minuten freigegeben.|Критические финансовые действия доступны в течение 15 минут.
30 % vom Netto-Abonnementumsatz · Trial-Gewichtung 0 %|30 % чистого дохода от подписок · вес пробных просмотров 0 %
Trainerverträge und Abrechnungen|Договоры тренеров и расчёты
Admin-Passwort bestätigen|Подтвердите пароль администратора
Finanzaktionen freigeben|Разрешить финансовые действия
Neue Vertragsversion|Новая версия договора
Gültig ab|Действует с
Gültig bis|Действует до
Teilnahme am 30-%-Pool|Участие в фонде 30 %
Fixbetrag pro Monat (EUR)|Фиксированная сумма в месяц (EUR)
Sonderbedingungen|Особые условия
Entwurf anlegen|Создать черновик
Kalendermonat berechnen|Рассчитать календарный месяц
Monat|Месяц
Zahlungen brutto|Валовые платежи
Abrechnung als Entwurf erstellen|Создать черновик расчёта
Finanzdaten werden geladen …|Загрузка финансовых данных…
Noch keine Vertragsversion vorhanden.|Версий договора пока нет.
Version|Версия
· Pool|· Фонд
Aktivieren|Активировать
· zahlbar|· к выплате
· Vortrag|· перенос
Geprüft|Проверено
Freigeben|Утвердить
Externe Zahlungsreferenz|Внешний идентификатор платежа
Als bezahlt markieren|Отметить как оплаченное
Bestätigte Wiedergabezeit|Подтверждённое время просмотра
Bezahlt:|Платные просмотры:
Sek. · Trial:|сек. · Пробные просмотры:
Sek.|сек.
Noch keine bestätigten Wiedergabeintervalle.|Подтверждённых интервалов просмотра пока нет.
Sek. · Trial|сек. · Пробные просмотры
`;
export const messages: Record<string, readonly [string, string]> = Object.fromEntries([
  ...rows
    .trim()
    .split('\n')
    .map((line) => {
      const [source = '', de = '', ru = ''] = line.split('|');
      return [source, [de, ru]];
    }),
  ...germanRussian
    .trim()
    .split('\n')
    .map((line) => {
      const [de = '', ru = ''] = line.split('|');
      return [de, [de, ru]];
    }),
]);
