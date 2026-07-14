WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def get_day_name(day_num: int) -> str:
    # Wrap around after 7
    return WEEKDAYS[(day_num - 1) % 7]
