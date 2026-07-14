from sqlalchemy.orm import Session
from db.session import engine, SessionLocal
from db.models.workout import Workout
from db.models.food import FoodItem


def seed_workouts(session: Session):
    workouts = [
        Workout(name='Push-ups', unit='reps', calories_per_unit=0.35, muscle_groups=['chest', 'triceps', 'shoulders'], difficulty='medium'),
        Workout(name='Squats', unit='reps', calories_per_unit=0.32, muscle_groups=['legs', 'glutes'], difficulty='easy'),
        Workout(name='Jumping Jacks', unit='minutes', calories_per_unit=8.0, muscle_groups=['full body'], difficulty='easy'),
        Workout(name='Surya Namaskar', unit='reps', calories_per_unit=4.0, muscle_groups=['full body', 'yoga'], difficulty='medium'),
        Workout(name='Plank', unit='minutes', calories_per_unit=5.0, muscle_groups=['core', 'abs'], difficulty='medium'),
        Workout(name='Lunges', unit='reps', calories_per_unit=0.35, muscle_groups=['legs', 'glutes'], difficulty='medium'),
        Workout(name='Mountain Climbers', unit='minutes', calories_per_unit=10.0, muscle_groups=['core', 'cardio'], difficulty='hard'),
        Workout(name='Burpees', unit='reps', calories_per_unit=1.0, muscle_groups=['full body'], difficulty='hard'),
        Workout(name='Cycling (indoor)', unit='minutes', calories_per_unit=7.5, muscle_groups=['legs', 'cardio'], difficulty='easy'),
        Workout(name='Yoga (general)', unit='minutes', calories_per_unit=3.0, muscle_groups=['flexibility', 'calm'], difficulty='easy'),
    ]
    for workout in workouts:
        exists = session.query(Workout).filter_by(name=workout.name).first()
        if not exists:
            session.add(workout)
    session.commit()


def _food(**kwargs):
    kwargs.setdefault("vitamins", {})
    kwargs.setdefault("unit_conversions", {})
    kwargs.setdefault("source", "system")
    kwargs.setdefault("user_id", None)
    kwargs.setdefault("is_drink", kwargs.get("category") == "drink")
    return FoodItem(**kwargs)


def seed_food_items(session: Session):
    food_items = [
        # Staples
        _food(name='Chapati', calories=70, protein=2.5, carbs=15, fats=0.5, reference_amount=40, reference_unit='g', unit_conversions={"piece": 40}, category='food', serving_label='1 piece'),
        _food(name='Rice (cooked)', calories=130, protein=2.7, carbs=28, fats=0.3, reference_amount=100, reference_unit='g', unit_conversions={"cup": 158}, category='food'),
        _food(name='Dal (cooked)', calories=120, protein=9, carbs=20, fats=2, reference_amount=100, reference_unit='g', unit_conversions={"cup": 200}, category='food'),
        _food(name='Paneer', calories=265, protein=18, carbs=1.2, fats=21, reference_amount=100, reference_unit='g', category='food'),
        _food(name='Banana', calories=89, protein=1.1, carbs=23, fats=0.3, reference_amount=100, reference_unit='g', unit_conversions={"piece": 118}, category='food', serving_label='1 medium'),
        _food(name='Brown Rice (cooked)', calories=112, protein=2.3, carbs=24, fats=0.8, reference_amount=100, reference_unit='g', category='food'),
        _food(name='Oats (dry)', calories=389, protein=17, carbs=66, fats=7, reference_amount=100, reference_unit='g', unit_conversions={"cup": 80}, category='food'),
        _food(name='Whole Wheat Bread', calories=247, protein=13, carbs=41, fats=3.4, reference_amount=100, reference_unit='g', unit_conversions={"slice": 28}, category='food'),
        _food(name='Idli', calories=58, protein=2, carbs=12, fats=0.2, reference_amount=40, reference_unit='g', unit_conversions={"piece": 40}, category='food'),
        _food(name='Dosa', calories=133, protein=2.7, carbs=18, fats=5.5, reference_amount=70, reference_unit='g', unit_conversions={"piece": 70}, category='food'),
        _food(name='Poha', calories=130, protein=2.5, carbs=26, fats=1.5, reference_amount=100, reference_unit='g', category='food'),
        _food(name='Quinoa (cooked)', calories=120, protein=4.4, carbs=21, fats=1.9, reference_amount=100, reference_unit='g', category='food'),
        # Proteins
        _food(name='Chicken Breast (cooked)', calories=165, protein=31, carbs=0, fats=3.6, reference_amount=100, reference_unit='g', category='food'),
        _food(name='Eggs (whole)', calories=155, protein=13, carbs=1.1, fats=11, reference_amount=100, reference_unit='g', unit_conversions={"piece": 50}, category='food', serving_label='1 large egg'),
        _food(name='Egg White', calories=52, protein=11, carbs=0.7, fats=0.2, reference_amount=100, reference_unit='g', unit_conversions={"piece": 33}, category='food'),
        _food(name='Tofu', calories=76, protein=8, carbs=1.9, fats=4.8, reference_amount=100, reference_unit='g', category='food'),
        _food(name='Greek Yogurt', calories=97, protein=9, carbs=3.6, fats=5, reference_amount=100, reference_unit='g', unit_conversions={"cup": 170}, category='food'),
        _food(name='Curd (plain)', calories=98, protein=3.5, carbs=4.7, fats=4.3, reference_amount=100, reference_unit='g', unit_conversions={"cup": 200}, category='food'),
        _food(name='Fish (salmon cooked)', calories=208, protein=20, carbs=0, fats=13, reference_amount=100, reference_unit='g', category='food'),
        _food(name='Chickpeas (cooked)', calories=164, protein=8.9, carbs=27, fats=2.6, reference_amount=100, reference_unit='g', category='food'),
        # Vegetables & fruit
        _food(name='Spinach (cooked)', calories=23, protein=2.9, carbs=3.6, fats=0.3, reference_amount=100, reference_unit='g', category='food'),
        _food(name='Broccoli (cooked)', calories=35, protein=2.4, carbs=7, fats=0.4, reference_amount=100, reference_unit='g', category='food'),
        _food(name='Potato (boiled)', calories=87, protein=1.9, carbs=20, fats=0.1, reference_amount=100, reference_unit='g', category='food'),
        _food(name='Sweet Potato (baked)', calories=90, protein=2, carbs=21, fats=0.2, reference_amount=100, reference_unit='g', category='food'),
        _food(name='Apple', calories=52, protein=0.3, carbs=14, fats=0.2, reference_amount=100, reference_unit='g', unit_conversions={"piece": 182}, category='food'),
        _food(name='Orange', calories=47, protein=0.9, carbs=12, fats=0.1, reference_amount=100, reference_unit='g', unit_conversions={"piece": 130}, category='food'),
        _food(name='Avocado', calories=160, protein=2, carbs=8.5, fats=15, reference_amount=100, reference_unit='g', unit_conversions={"piece": 150}, category='food'),
        _food(name='Mixed Salad Greens', calories=20, protein=1.5, carbs=3.5, fats=0.2, reference_amount=100, reference_unit='g', category='food'),
        # Snacks
        _food(name='Almonds', calories=579, protein=21, carbs=22, fats=50, reference_amount=100, reference_unit='g', unit_conversions={"piece": 1.2, "handful": 28}, category='snack'),
        _food(name='Peanuts (roasted)', calories=567, protein=26, carbs=16, fats=49, reference_amount=100, reference_unit='g', unit_conversions={"handful": 28}, category='snack'),
        _food(name='Protein Bar', calories=200, protein=20, carbs=22, fats=7, reference_amount=60, reference_unit='g', unit_conversions={"piece": 60}, category='snack', serving_label='1 bar'),
        _food(name='Popcorn (air-popped)', calories=387, protein=13, carbs=78, fats=4.5, reference_amount=100, reference_unit='g', unit_conversions={"cup": 8}, category='snack'),
        _food(name='Dark Chocolate', calories=546, protein=4.9, carbs=61, fats=31, reference_amount=100, reference_unit='g', unit_conversions={"square": 10}, category='snack'),
        # Condiments / fats
        _food(name='Olive Oil', calories=884, protein=0, carbs=0, fats=100, reference_amount=100, reference_unit='ml', unit_conversions={"tbsp": 15, "tsp": 5}, category='condiment'),
        _food(name='Ghee', calories=900, protein=0, carbs=0, fats=100, reference_amount=100, reference_unit='g', unit_conversions={"tbsp": 14}, category='condiment'),
        _food(name='Peanut Butter', calories=588, protein=25, carbs=20, fats=50, reference_amount=100, reference_unit='g', unit_conversions={"tbsp": 16}, category='condiment'),
        _food(name='Honey', calories=304, protein=0.3, carbs=82, fats=0, reference_amount=100, reference_unit='g', unit_conversions={"tbsp": 21}, category='condiment'),
        # Drinks
        _food(name='Milk', calories=60, protein=3.2, carbs=5, fats=3.25, reference_amount=100, reference_unit='ml', unit_conversions={"cup": 240}, category='drink', is_drink=True, serving_label='100 ml'),
        _food(name='Black Coffee', calories=2, protein=0.3, carbs=0, fats=0, reference_amount=100, reference_unit='ml', unit_conversions={"cup": 240}, category='drink', is_drink=True),
        _food(name='Tea (black, unsweetened)', calories=1, protein=0, carbs=0.3, fats=0, reference_amount=100, reference_unit='ml', unit_conversions={"cup": 240}, category='drink', is_drink=True),
        _food(name='Green Tea', calories=1, protein=0, carbs=0, fats=0, reference_amount=100, reference_unit='ml', unit_conversions={"cup": 240}, category='drink', is_drink=True),
        _food(name='Orange Juice', calories=45, protein=0.7, carbs=10.4, fats=0.2, reference_amount=100, reference_unit='ml', unit_conversions={"cup": 240}, category='drink', is_drink=True),
        _food(name='Cola / Soft Drink', calories=42, protein=0, carbs=10.6, fats=0, reference_amount=100, reference_unit='ml', unit_conversions={"can": 330, "cup": 240}, category='drink', is_drink=True),
        _food(name='Protein Shake (whey)', calories=80, protein=15, carbs=3, fats=1, reference_amount=100, reference_unit='ml', unit_conversions={"scoop_mixed": 300}, category='drink', is_drink=True, serving_label='ready shake'),
        _food(name='Lassi (sweet)', calories=75, protein=2.5, carbs=12, fats=2, reference_amount=100, reference_unit='ml', unit_conversions={"glass": 250}, category='drink', is_drink=True),
        _food(name='Coconut Water', calories=19, protein=0.7, carbs=3.7, fats=0.2, reference_amount=100, reference_unit='ml', unit_conversions={"cup": 240}, category='drink', is_drink=True),
        _food(name='Almond Milk (unsweetened)', calories=15, protein=0.6, carbs=0.3, fats=1.1, reference_amount=100, reference_unit='ml', unit_conversions={"cup": 240}, category='drink', is_drink=True),
        _food(name='Smoothie (fruit)', calories=60, protein=1, carbs=13, fats=0.5, reference_amount=100, reference_unit='ml', unit_conversions={"glass": 300}, category='drink', is_drink=True),
        _food(name='Beer (regular)', calories=43, protein=0.5, carbs=3.6, fats=0, reference_amount=100, reference_unit='ml', unit_conversions={"can": 330, "pint": 473}, category='drink', is_drink=True),
        # Supplements
        _food(name='Whey Protein Powder', calories=400, protein=80, carbs=8, fats=5, reference_amount=100, reference_unit='g', unit_conversions={"scoop": 30}, category='supplement', serving_label='1 scoop ~30g'),
        _food(name='Creatine Monohydrate', calories=0, protein=0, carbs=0, fats=0, reference_amount=5, reference_unit='g', unit_conversions={"scoop": 5}, category='supplement'),
        # Indian Specials (Requested)
        _food(name='Aloo Paratha', calories=290, protein=5.0, carbs=45.0, fats=9.0, reference_amount=100, reference_unit='g', unit_conversions={"piece": 100}, category='food', serving_label='1 piece'),
        _food(name='Chole Bhature', calories=300, protein=7.5, carbs=38.0, fats=13.0, reference_amount=100, reference_unit='g', unit_conversions={"plate": 150}, category='food', serving_label='1 plate'),
        _food(name='Pav Bhaji', calories=200, protein=4.5, carbs=28.0, fats=7.5, reference_amount=100, reference_unit='g', unit_conversions={"plate": 200}, category='food', serving_label='1 plate'),
        _food(name='Biryani (Veg)', calories=200, protein=5.0, carbs=32.0, fats=5.0, reference_amount=100, reference_unit='g', unit_conversions={"plate": 300}, category='food', serving_label='1 plate'),
        _food(name='Butter Chicken', calories=240, protein=16.0, carbs=4.0, fats=18.0, reference_amount=100, reference_unit='g', unit_conversions={"cup": 200}, category='food', serving_label='1 cup'),
        _food(name='Masala Chai', calories=60, protein=1.5, carbs=8.0, fats=2.0, reference_amount=100, reference_unit='ml', unit_conversions={"cup": 150}, category='drink', is_drink=True, serving_label='1 cup'),
        _food(name='Samosa', calories=325, protein=4.5, carbs=32.0, fats=20.0, reference_amount=100, reference_unit='g', unit_conversions={"piece": 80}, category='snack', serving_label='1 piece'),
        _food(name='Khichdi', calories=120, protein=4.0, carbs=22.0, fats=2.0, reference_amount=100, reference_unit='g', unit_conversions={"cup": 200}, category='food', serving_label='1 cup'),
        _food(name='Upma', calories=150, protein=3.5, carbs=27.0, fats=3.0, reference_amount=100, reference_unit='g', unit_conversions={"cup": 150}, category='food', serving_label='1 cup'),
        _food(name='Gulab Jamun', calories=300, protein=3.0, carbs=58.0, fats=6.0, reference_amount=100, reference_unit='g', unit_conversions={"piece": 40}, category='snack', serving_label='1 piece'),
        _food(name='Dhokla', calories=160, protein=6.0, carbs=26.0, fats=3.0, reference_amount=100, reference_unit='g', unit_conversions={"piece": 40}, category='snack', serving_label='1 piece'),
        _food(name='Rajma (cooked)', calories=140, protein=9.0, carbs=22.0, fats=1.5, reference_amount=100, reference_unit='g', unit_conversions={"cup": 200}, category='food', serving_label='1 cup'),
        _food(name='Dal Makhani', calories=160, protein=6.0, carbs=16.0, fats=8.0, reference_amount=100, reference_unit='g', unit_conversions={"cup": 200}, category='food', serving_label='1 cup'),
        _food(name='Sambar', calories=80, protein=2.5, carbs=12.0, fats=2.5, reference_amount=100, reference_unit='g', unit_conversions={"cup": 200}, category='food', serving_label='1 cup'),
        _food(name='Palak Paneer', calories=180, protein=9.0, carbs=6.0, fats=13.0, reference_amount=100, reference_unit='g', unit_conversions={"cup": 200}, category='food', serving_label='1 cup'),
        _food(name='Naan (plain)', calories=290, protein=8.0, carbs=52.0, fats=5.0, reference_amount=100, reference_unit='g', unit_conversions={"piece": 90}, category='food', serving_label='1 piece'),
    ]

    for food in food_items:
        exists = session.query(FoodItem).filter_by(name=food.name).first()
        if not exists:
            session.add(food)
        else:
            # Backfill category fields on existing seed rows
            if not getattr(exists, "category", None):
                exists.category = food.category
            if getattr(exists, "is_drink", None) is None:
                exists.is_drink = food.is_drink
            if not getattr(exists, "source", None):
                exists.source = "system"
    session.commit()


def main():
    from db.models import Base
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as session:
        seed_workouts(session)
        seed_food_items(session)
        print("[SUCCESS] Seed data inserted successfully (idempotent).")


if __name__ == "__main__":
    main()
