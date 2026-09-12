LOOP — Sample CSV Files for Testing
=====================================

10 sample transaction CSVs representing different user personas.
Upload any of these at localhost:3000/upload to test the app.

FILE                          PERSONA                  EXPECTED PERSONALITY
---------------------------   ----------------------   ----------------------
01_urban_professional.csv     City professional         Convenience Consumer
02_eco_conscious.csv          Eco-aware commuter        Conscious Optimizer / Green Pioneer
03_heavy_footprint.csv        High spender + flights    Carbon Heavy
04_student_budget.csv         College student           Mindful Consumer
05_frequent_flyer.csv         Business traveller        Carbon Heavy
06_foodie_bengaluru.csv       Food delivery addict      Habitual Spender / Convenience Consumer
07_ev_owner.csv               EV + public transport     Mindful Consumer / Conscious Optimizer
08_shopaholic.csv             Fashion + electronics     Habitual Spender
09_work_from_home.csv         WFH, high electricity     Convenience Consumer
10_mixed_moderate.csv         Balanced spender          Mindful Consumer

COLUMN FORMAT REQUIRED
-----------------------
date        (optional) YYYY-MM-DD
merchant    Name of store / app / service
amount      Amount spent in INR (positive numbers)

The app also accepts columns named:
  description, narration, details, particulars  →  treated as merchant
  debit, withdrawal, spent                      →  treated as amount
