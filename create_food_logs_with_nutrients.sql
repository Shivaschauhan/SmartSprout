-- Drop the view if it exists
DROP VIEW IF EXISTS food_logs_with_nutrients;

-- Create the view
CREATE VIEW food_logs_with_nutrients AS
SELECT
    fl.id AS log_id,
    fl.user_id,
    fi.name AS food_name,
    fl.quantity,
    fl.unit,

    -- Convert logged amount to grams
    CASE
        WHEN fl.unit = fi.reference_unit
            THEN fl.quantity * fi.reference_amount
        ELSE fl.quantity * COALESCE(CAST(json_extract(fi.unit_conversions, '$.' || fl.unit) AS NUMERIC), 0)
    END AS grams_consumed,

    -- Nutrients calculation
    ROUND(
        fi.calories *
        (
            CASE
                WHEN fl.unit = fi.reference_unit
                    THEN fl.quantity
                ELSE COALESCE((fl.quantity * CAST(json_extract(fi.unit_conversions, '$.' || fl.unit) AS NUMERIC)) / fi.reference_amount, 0)
            END
        ), 2
    ) AS total_calories,

    ROUND(
        fi.protein *
        (
            CASE
                WHEN fl.unit = fi.reference_unit
                    THEN fl.quantity
                ELSE COALESCE((fl.quantity * CAST(json_extract(fi.unit_conversions, '$.' || fl.unit) AS NUMERIC)) / fi.reference_amount, 0)
            END
        ), 2
    ) AS total_protein,

    ROUND(
        fi.carbs *
        (
            CASE
                WHEN fl.unit = fi.reference_unit
                    THEN fl.quantity
                ELSE COALESCE((fl.quantity * CAST(json_extract(fi.unit_conversions, '$.' || fl.unit) AS NUMERIC)) / fi.reference_amount, 0)
            END
        ), 2
    ) AS total_carbs,

    ROUND(
        fi.fats *
        (
            CASE
                WHEN fl.unit = fi.reference_unit
                    THEN fl.quantity
                ELSE COALESCE((fl.quantity * CAST(json_extract(fi.unit_conversions, '$.' || fl.unit) AS NUMERIC)) / fi.reference_amount, 0)
            END
        ), 2
    ) AS total_fats

FROM food_logs fl
JOIN food_items fi
  ON fl.food_id = fi.id;
