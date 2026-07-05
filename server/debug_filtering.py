import os
import django
from datetime import date
import calendar
import sys

# Setup Django environment if not already setup
if not os.environ.get('DJANGO_SETTINGS_MODULE'):
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()

from ddtme.models import BigTask

def debug_filtering():
    with open('debug_output.txt', 'w') as f:
        f.write("--- Debugging Big Task Filtering ---\n")
        
        # 1. Define the month we are filtering for (Feb 2026 based on user context)
        month = 2
        year = 2026
        _, last_day = calendar.monthrange(year, month)
        month_start = date(year, month, 1)
        month_end = date(year, month, last_day)
        
        f.write(f"Filtering for: {month_start} to {month_end}\n")

        # 2. List all Big Tasks
        tasks = BigTask.objects.all()
        f.write(f"Total Big Tasks found: {tasks.count()}\n")

        for task in tasks:
            # Check if it overlaps
            # Logic: Start <= Month End AND Target >= Month Start
            start_cond = task.start_date <= month_end
            end_cond = task.target_date >= month_start
            overlaps = start_cond and end_cond
            
            status = "[INCLUDED]" if overlaps else "[EXCLUDED]"
            
            f.write(f"ID: {task.id} | Title: {task.title} | Start: {task.start_date} | Target: {task.target_date} | {status}\n")
            
            if not overlaps:
                 f.write(f"   -> Start <= MonthEnd ({task.start_date} <= {month_end}): {start_cond}\n")
                 f.write(f"   -> Target >= MonthStart ({task.target_date} >= {month_start}): {end_cond}\n")

if __name__ == "__main__":
    debug_filtering()
