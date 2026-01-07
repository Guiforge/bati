---
story_id: "13.4"
story_key: "13-4-equipment-management-and-alternatives"
epic: "Epic 13: Adaptive Coach Intelligence"
title: "Equipment Management & Exercise Alternatives"
status: "ready-for-dev"
created: "2026-01-06"
dependencies:
  - "8-4-auto-generate-4-week-training-plans"
  - "4-2-start-quest-from-quest-library"
---

# Story 13.4: Equipment Management & Exercise Alternatives

## User Story
Refer to epics.md for complete user story, acceptance criteria, and implementation details.

## Quick Reference
- **Epic**: Epic 13: Adaptive Coach Intelligence
- **Status**: ready-for-dev
- **Dependencies**: Story 8.4 (Plan Generation), Story 4.2 (Quest Start)
- **Full Details**: `_bmad-output/planning-artifacts/epics.md` Story 13.4 section

## Key Components

### Database Schema
```sql
CREATE TABLE user_equipment (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  equipment_name TEXT NOT NULL,
  is_available BOOLEAN DEFAULT true,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Extends exercise_alternatives table from Story 13.2
-- No new table needed, just populate required_equipment field
```

### Equipment Types
```typescript
const EQUIPMENT_TYPES = [
  "Dumbbells",
  "Barbell",
  "Resistance Bands",
  "Pull-up Bar",
  "Bench",
  "Kettlebell",
  "Bodyweight Only"
];

const EQUIPMENT_PRESETS = {
  "Home Gym": ["Dumbbells", "Resistance Bands", "Pull-up Bar"],
  "Commercial Gym": ["Dumbbells", "Barbell", "Bench", "Kettlebell", "Pull-up Bar"],
  "Travel (Bodyweight)": ["Bodyweight Only"]
};
```

### Algorithm: Equipment Filtering
```typescript
function filterQuestsByEquipment(quests: Quest[], userEquipment: string[]): Quest[] {
  return quests.map(quest => {
    const requiredEquipment = getQuestRequiredEquipment(quest);
    const isAvailable = requiredEquipment.every(eq => userEquipment.includes(eq));
    
    return {
      ...quest,
      isAvailable,
      missingEquipment: isAvailable ? [] : requiredEquipment.filter(eq => !userEquipment.includes(eq))
    };
  });
}

function getExerciseAlternative(exerciseId: number, userEquipment: string[]): Exercise | null {
  const alternatives = getAlternatives(exerciseId);
  
  // Find first alternative that matches user equipment
  return alternatives.find(alt => 
    userEquipment.includes(alt.required_equipment) || 
    alt.required_equipment === "Bodyweight Only"
  );
}
```

### UI Components Needed
1. **EquipmentSettingsScreen** - Settings > Equipment
2. **EquipmentCheckboxList** - Toggle available equipment
3. **EquipmentPresetSelector** - Quick presets (Home/Gym/Travel)
4. **QuestEquipmentTags** - Show required equipment in quest card
5. **ExerciseSwapDialog** - During workout: "Don't have dumbbells? Try this instead"

### Integration Points
- Settings screen (Epic 12, Story 12.4 "More" page)
- Quest library filtering (Epic 4, Story 4.1)
- Quest start screen (Epic 4, Story 4.2)
- Training plan generation (Epic 8, Story 8.4)
- Exercise substitution during workout (Epic 3, Story 3.5)

## Implementation Notes
This story is ready for development. All acceptance criteria are documented in the epics.md file.

Developer should review:
1. User story and acceptance criteria in epics.md (Story 13.4)
2. Knowledge base: docs/knowledge/coaching.md (equipment adaptation)
3. Exercise database structure and required equipment field
4. Quest data model in db/schema.ts
5. Settings screen patterns in app/

## Technical Considerations
- Equipment list is extensible (user can add custom equipment)
- Filtering is non-destructive (unavailable quests marked, not hidden)
- Alternative exercises must match: muscle group, difficulty, duration
- Presets are convenience shortcuts (not limiting)
- Consider "hybrid" quests (some exercises need equipment, some don't)

## Knowledge Base Reference
Based on docs/knowledge/coaching.md:
- Adaptation aux équipements disponibles: proposition d'alternatives en cas de manque de matériel
- Exemple: remplacer développé couché par pompes lestées (no bench needed)

## Data Seeding
Need to populate exercise_alternatives table with common mappings:
- Bench Press → Push-ups (weighted if possible)
- Pull-ups (bar) → Resistance band rows
- Barbell Squat → Bodyweight squats (higher reps)

## Status
ready-for-dev - Ready to be implemented by Dev agent using full context from planning artifacts.
