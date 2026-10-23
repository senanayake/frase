# Extending Frase’s learning path

The first unit is an editorial A1–A2-oriented pilot, not a CEFR assessment or a complete syllabus. It uses Mexican/Latin American pronouns and everyday meal planning. Existing tense exercises and personal lesson packs remain available in the Practice tab. Curriculum content lives in `dist/data/curriculum.json`; its logic lives in `dist/js/curriculum.js`.

## Content model

- `units`: stable ID, title, communicative goal, suggested level, regional variant, ordered quest IDs, prerequisite unit IDs.
- `patterns`: stable ID, label, explanation, Spanish example and English meaning.
- `quests`: stable ID, goal, pattern ID, suggested prerequisite quest IDs, ordered exercise IDs, required IDs and checkpoint IDs.
- `cards`: existing Frase exercise fields plus unit/quest/family/pattern IDs, proficiency target, theme, regional variant and learning stage.
- `verbs`: optional additions to the conjugation notebook, with five Latin American subject forms for each existing tense.

The current pilot uses one family per quest. Learning stages are `form`, `build`, `checkpoint` and `personal`. Personal cards use `create` and self-review. They are optional and cannot be required checkpoints. Existing custom lesson-pack imports remain separate; they do not create curriculum units automatically.

## Authoring workflow

1. Choose one communicative goal and identify assumed grammar and vocabulary. Use CEFR/Instituto Cervantes inventories as planning references. Check Mexican usage and useful collocations; a frequency list alone is not a lesson order.
2. Add a pattern reference. Keep source notes in `sources`. Write your own examples rather than copying a curriculum inventory wholesale.
3. Add a quest with one family of related sentences. Begin with focused form practice; build full sentences, change one feature and end with two short contextual checkpoints. Keep new vocabulary small.
4. Supply all accepted variants intentionally, including reasonable subject omission and word order. The checker matches authored forms; it does not validate unrestricted Spanish. Personal sentences belong in self-review cards.
5. Give every exercise three graduated hints and a model sentence. Cloze models must reproduce the prompt with one accepted answer substituted for `___`. Check accent marks, agreement, tense meaning and infinitives after conjugated verbs.
6. Have a Spanish-proficient reviewer examine naturalness and ambiguity. Automated tests cannot establish linguistic correctness.
7. Run `node scripts/check-curriculum.mjs` and `npm run check`. Try the unit with reference open, with hints, independently and using speech. Check phone layout and backups.
8. Preserve existing IDs when correcting explanations or adding accepted variants. For a substantively different exercise, add a new ID. Avoid deleting old cards because their IDs link to review history.

The pilot file itself is the complete authoring example. There is no build step for editing curriculum JSON. `scripts/build-content.py` regenerates the legacy tense course only; it does not overwrite curriculum content.

## Progress and rewards

All achievements derive from retained `state.history`, so existing backups keep working without a schema migration. Standard SRS records continue to use exercise IDs. Events optionally include `unitId`, `questId`, `patternId` and `learningStage` for inspection.

- Practice completion: every required card has at least one `correct` or `assisted` result. Help earns progress. Revealing a model alone does not count as a successful production; self-review is separate.
- Independent checkpoint set: every checkpoint has a `correct` result, which the UI only records when that attempt used no hints, reference, model audio or repairs.
- Later recall: every checkpoint has two consecutive `correct` results at least 24 hours apart, with no intervening recorded event for that card. Future-dated events are excluded. Same-day repetition does not earn this milestone.
- Weekly goal: distinct local calendar days with completed exercise events, Monday–Sunday. Default three days; adjustable from one to seven. No streak reset penalty, points economy, ranking or speed bonus.

Milestones describe the authored exercises, not general conversation ability or an official proficiency level. Voice-supplied spelling remains labelled separately. Checkpoints start with quick reference closed; it can be reopened and then counts as support. Prerequisites are suggestions, not locks.

## Validation

The validator checks ID collisions, mappings, prerequisite cycles, dangling cards, required/checkpoint membership, hint completeness, answer-key/model consistency and verb-table structure. The tests additionally cover supported progress, delayed-recall timing, due selection, weekly boundaries and older backups. Linguistic review and actual iPhone speech tests remain human checks.


## Expanded path (v1.5)

Twelve units, three quests each, progress from A1 daily needs and A2 past events to B1 narration, plans and subjunctive wishes; B2 mood contrasts, counterfactuals and reported speech; and introductory C1 argument, reformulation and short mediation. Levels are author-selected practice groupings informed by the linked Cervantes inventories, not official assignments of each individual sentence. Early C1 drills are scaffolding for longer discourse, not a claim that sentence completion establishes advanced proficiency.

Regenerate the expansion with `python3 scripts/expand-curriculum.py`, then run `node scripts/check-curriculum.mjs` and `npm run check`. The script preserves the original three quests and their 21 exercise IDs; new authored units use stable named IDs. Never rename an ID after release. Changing a task's meaning requires a new ID. New checked translations need explicit wording constraints and accepted alternatives; personal tasks remain self-reviewed.

Optional `tenses` carry `questOnly: true` so Practice keeps its original selection. Verb supplements merge individual tense tables instead of replacing existing forms. A missing full verb table shows a reference link; a quest always supplies its own focused rule and model. Curriculum source IDs are attached to units and linked from the path. The level filter and collapsible units keep the longer path usable on mobile.


## Foundation depth (v1.6)

Eight banks cover tener que in the present; regular and everyday irregular preterite; imperfect habits; background plus event; present perfect experience; simple future; and a new preterite/imperfect meaning-choice quest. Each has 24 checked examples and one optional personal task. There are 37 quests and 403 exercises overall. The advanced path retains its introductory scope.

To rebuild all authored content, run `python3 scripts/expand-curriculum.py` followed by `python3 scripts/deepen-curriculum.py`, then the validator and tests. The second script can also be rerun alone; it replaces only its own stable depth IDs. Do not publish the expanded path without applying the depth script.

`introIds` preserves the initial seven-card sequence. Original `requiredIds` and `checkpointIds` remain unchanged, so prior achievements are retained. `bankIds` lists all 24 checked prompts. `challengeIds` reserves six full-sentence tasks from ordinary varied rounds; mixed challenges select up to five, unseen first, and repeat after the set has been tried. They are not a proficiency test. New meaning-choice cards have `chooseTense: true`, hiding the target from text and task audio and leaving the reference tense unselected.

After introduction completion, learn opens a short adaptive round. Explicit varied practice is available at any time. A round selects up to two due prompts, one additional previously supported/revealed prompt and three unseen prompts, then fills unused slots by exposure and recency. Challenge prompts are excluded from that pool; due review can include any previously attempted checked card, capped at six. The optional personal sentence follows ordinary practice. Review dates retain the existing SRS scheduling.

Bank tried/matched/independent counts derive from retained history and are separate from introductory checkpoints and delayed-recall milestones. Spoken input supplies spelling and accents; no automatic fluency or pronunciation score is claimed. Personal prompts invite spoken production but remain self-reviewed. These fixed authored banks require no AI or paid API.


## Paper context mapping

Conjugations read `verbs[].forms[tense]` and cover all five subject groups before filling additional slots. A single-person or single-verb focus may produce a smaller sheet. Sentence mode takes checked cloze/translate/transform tasks from the selected tense or quest; new advanced tenses can use quest cards even without full verb tables. Meaning-choice worksheets hide the tense cue until the answer key. Review mode filters by the most recent saved supported/revealed attempt or current due date within the selected source. These are task selection contexts, not separate proficiency levels or automatic fluency assessments.

Keep worksheet manifests and export history separate from SRS. Any future marking of handwritten work needs an explicit self-review flow; a print/download event is not evidence of learning. The PDF key uses model wording, not a declaration that alternative Spanish is wrong. Open tasks remain self-reviewed. Validate forms, context boundaries, no duplicates, no progress mutation, and generated PDF structure/layout after extending the worksheet code.
