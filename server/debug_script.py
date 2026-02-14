import os
import sys
import datetime
import calendar

# 1. Setup paths and env matching valid pattern
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from ddtme.models import BigTask

def run_debug():
    output_file = os.path.join(current_dir, 'debug_output.txt')
    print(f"Writing debug info to {output_file}")
    
    with open(output_file, 'w') as f:
        f.write(f"--- Debug Run at {datetime.datetime.now()} ---\n")
        
        # Filter for Feb 2026
        month = 2
        year = 2026
        _, last_day = calendar.monthrange(year, month)
        month_start = datetime.date(year, month, 1)
        month_end = datetime.date(year, month, last_day)
        
        f.write(f"Filtering for: {month_start} to {month_end}\n")
        
        tasks = BigTask.objects.all()
        f.write(f"Total Tasks: {tasks.count()}\n")
        
        for task in tasks:
            start_cond = task.start_date <= month_end
            end_cond = task.target_date >= month_start
            overlaps = start_cond and end_cond
            
            status = "INCLUDED" if overlaps else "EXCLUDED"
            
            f.write(f"[{status}] ID:{task.id} Title:'{task.title}' Start:{task.start_date} End:{task.target_date}\n")
            
            if not overlaps:
                f.write(f"    Start<=MonthEnd ({task.start_date}<={month_end}): {start_cond}\n")
                f.write(f"    End>=MonthStart ({task.target_date}>={month_start}): {end_cond}\n")

if __name__ == "__main__":
    try:
        run_debug()
        print("Debug script finished.")
    except Exception as e:
        print(f"Error: {e}")
        with open('debug_error.txt', 'w') as errCheck:
            errCheck.write(str(e))
