"""
Excel file processing utility for bulk task imports.
Uses pandas and openpyxl for reading xlsx files with dynamic column mapping.
"""

import pandas as pd
from datetime import datetime
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.utils import timezone
from projects.models import Project
from clients.models import Client
from .models import Task

User = get_user_model()


class ExcelTaskImporter:
    """
    Handles reading Excel files and mapping columns to Task model fields.
    Supports flexible column ordering and extra columns.
    """

    FIELD_MAPPINGS = {
        'task': ['task', 'title', 'task_name', 'task_title', 'task name', 'task title'],
        'client': ['client', 'client_name', 'client_org', 'organization', 'client name', 'client org'],
        'project': ['project', 'project_name', 'project_title', 'project name', 'project title'],
        'assigned_to': ['assigned_to', 'assigned_to_email', 'assignee', 'assignee_email', 'email', 'assigned to', 'assigned to email'],
        'target_date': ['target_date', 'due_date', 'deadline', 'duedate', 'date', 'target date', 'due date'],
        'description': ['description', 'remarks', 'notes', 'comment'],
    }

    REQUIRED_FIELDS = ['task']  

    def __init__(self):
        self.errors = []
        self.warnings = []
        self.created_tasks = []
        self.draft_rows = []

    @staticmethod
    def _normalize_lookup_text(value):
        return ' '.join(str(value or '').strip().split()).casefold()

    @staticmethod
    def calculate_edit_distance(s1, s2):
        """
        Calculate Levenshtein distance between two strings.
        Returns the minimum number of single-character edits needed.
        """
        s1 = s1.lower()
        s2 = s2.lower()
        
        if len(s1) < len(s2):
            return ExcelTaskImporter.calculate_edit_distance(s2, s1)
        
        if len(s2) == 0:
            return len(s1)
        
        previous_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row
        
        return previous_row[-1]

    def find_best_client_match(self, client_name):
        """
        Find the best matching client using fuzzy matching (Levenshtein distance).
        Returns (client_object, distance) if match found, else (None, float('inf'))
        Tolerance: max 1 character difference
        """
        if not client_name:
            return None, float('inf')

        normalized_input = self._normalize_lookup_text(client_name)
        if not normalized_input:
            return None, float('inf')
        
        best_match = None
        best_distance = float('inf')
        
        for client in Client.objects.all():
            candidate_name = self._normalize_lookup_text(client.company_name)
            if candidate_name == normalized_input:
                return client, 0

            distance = self.calculate_edit_distance(normalized_input, candidate_name)
            if distance < best_distance:
                best_distance = distance
                best_match = client
        
        # Only return match if within tolerance (1 char difference)
        if best_distance <= 1:
            return best_match, best_distance
        
        return None, best_distance

    def find_best_project_match(self, project_name):
        """
        Find the best matching project using fuzzy matching (Levenshtein distance).
        Returns (project_object, distance) if match found, else (None, float('inf'))
        Tolerance: max 1 character difference
        """
        if not project_name:
            return None, float('inf')

        normalized_input = self._normalize_lookup_text(project_name)
        if not normalized_input:
            return None, float('inf')
        
        best_match = None
        best_distance = float('inf')
        
        for project in Project.objects.all():
            candidate_name = self._normalize_lookup_text(project.name)
            if candidate_name == normalized_input:
                return project, 0

            distance = self.calculate_edit_distance(normalized_input, candidate_name)
            if distance < best_distance:
                best_distance = distance
                best_match = project
        
        # Only return match if within tolerance (1 char difference)
        if best_distance <= 1:
            return best_match, best_distance
        
        return None, best_distance

    @staticmethod
    def normalize_header(header):
        """
        Normalize Excel header: strip whitespace, convert to lowercase.
        """
        if not isinstance(header, str):
            return str(header).strip().lower()
        return header.strip().lower()

    def find_column_mapping(self, excel_headers):
        """
        Dynamically map Excel headers to Task model fields.
        Returns a dict: {field_name: excel_column_index}
        
        Returns:
            dict: Mapping of field names to column indices
            
        Throws:
            ValueError: If required 'task' column is missing
        """
        normalized_headers = [self.normalize_header(h) for h in excel_headers]
        column_mapping = {}

        # Find each field's column
        for field, aliases in self.FIELD_MAPPINGS.items():
            for col_idx, excel_header in enumerate(normalized_headers):
                if excel_header in aliases:
                    column_mapping[field] = col_idx
                    break

        # Validate required fields
        for required_field in self.REQUIRED_FIELDS:
            if required_field not in column_mapping:
                raise ValueError(
                    f"Required column '{required_field}' not found. "
                    f"Available columns: {', '.join(excel_headers)}"
                )

        return column_mapping

    @staticmethod
    def safe_to_datetime(date_value):
        """
        Safely convert date values to datetime.date object.
        Handles various formats: datetime objects, strings, pandas Timestamp, etc.
        
        Returns:
            datetime.date or None if conversion fails
        """
        if pd.isna(date_value) or date_value is None:
            return None

        try:
            # If it's already a datetime object
            if isinstance(date_value, datetime):
                return date_value.date()
            
            # If it's a pandas Timestamp
            if hasattr(date_value, 'date'):  # pd.Timestamp has .date() method
                return date_value.date()
            
            # If it's a string, try parsing
            if isinstance(date_value, str):
                # Try common date formats
                for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y', '%Y/%m/%d']:
                    try:
                        return datetime.strptime(date_value.strip(), fmt).date()
                    except ValueError:
                        continue
                # If no format matched, raise error
                raise ValueError(f"Could not parse date: {date_value}")
            
            return None
        except Exception as e:
            raise ValueError(f"Date conversion error for '{date_value}': {str(e)}")

    def read_excel(self, file_path):
        """
        Read Excel file and return DataFrame.
        
        Args:
            file_path: Path to .xlsx file
            
        Returns:
            pandas.DataFrame or raises error
        """
        try:
            df = pd.read_excel(file_path, sheet_name=0)
            if df.empty:
                raise ValueError("Excel file is empty")
            return df
        except Exception as e:
            raise ValueError(f"Failed to read Excel file: {str(e)}")

    def get_or_find_user(self, email_or_identifier):
        """
        Find user by multiple strategies with fallback.
        Tries (in order):
        1. Exact email match (case-insensitive)
        2. Exact username match
        3. Fuzzy match on email (max 1 char difference)
        4. Fuzzy match on username (max 1 char difference)
        5. Fuzzy match on first_name + last_name combination
        
        Args:
            email_or_identifier: Email, username, or name identifier
            
        Returns:
            User object or None if not found
        """
        if not email_or_identifier or pd.isna(email_or_identifier):
            return None

        identifier = str(email_or_identifier).strip()
        identifier_lower = self._normalize_lookup_text(identifier)
        
        all_users = list(User.objects.all())
        
        # Debug: Show all available users on first lookup only (once per import)
        if not hasattr(self, '_users_logged'):
            print(f"DEBUG: Available users in system:")
            for u in all_users:
                print(f"  - {u.email} (username: {u.username}, name: {u.first_name} {u.last_name})")
            self._users_logged = True
        
        print(f"DEBUG: Looking up user: '{identifier}'")
        
        # Strategy 1: Exact email match (case-insensitive)
        for user in all_users:
            if user.email and self._normalize_lookup_text(user.email) == identifier_lower:
                print(f"DEBUG: ✓ Found exact email match: {user.email}")
                return user
        
        # Strategy 2: Exact username match
        for user in all_users:
            if user.username and self._normalize_lookup_text(user.username) == identifier_lower:
                print(f"DEBUG: ✓ Found exact username match: {user.username}")
                return user
        
        # Strategy 3: Fuzzy match on email
        best_user = None
        best_distance = float('inf')
        
        for user in all_users:
            if user.email:
                distance = self.calculate_edit_distance(identifier_lower, self._normalize_lookup_text(user.email))
                if distance <= 1 and distance < best_distance:
                    best_distance = distance
                    best_user = user
                    print(f"DEBUG: Fuzzy email match: '{identifier}' ~> {user.email} (distance: {distance})")
        
        if best_user:
            return best_user
        
        # Strategy 4: Fuzzy match on username
        best_user = None
        best_distance = float('inf')
        
        for user in all_users:
            if user.username:
                distance = self.calculate_edit_distance(identifier_lower, self._normalize_lookup_text(user.username))
                if distance <= 1 and distance < best_distance:
                    best_distance = distance
                    best_user = user
                    print(f"DEBUG: ✓ Fuzzy username match: '{identifier}' ~> {user.username} (distance: {distance})")
        
        if best_user:
            return best_user
        
        # Strategy 5: Fuzzy match on full name (first_name + last_name)
        best_user = None
        best_distance = float('inf')
        
        for user in all_users:
            fullname = self._normalize_lookup_text(f"{user.first_name} {user.last_name}")
            if fullname:
                distance = self.calculate_edit_distance(identifier_lower, fullname)
                if distance <= 1 and distance < best_distance:
                    best_distance = distance
                    best_user = user
                    print(f"DEBUG: ✓ Fuzzy fullname match: '{identifier}' ~> {fullname} (distance: {distance})")
        
        if best_user:
            return best_user
        
        print(f"DEBUG: ✗ No user match found for '{identifier}'")
        return None

    def _build_scoped_candidate_users(self, project_obj=None, client_obj=None):
        """
        Build assignee candidates from the current project/client context.
        This keeps name matching aligned with who is actually part of that scope.
        """
        scoped_users = []
        seen_ids = set()

        def add_user(user_obj):
            if not user_obj:
                return
            user_id = getattr(user_obj, 'id', None)
            if not user_id or user_id in seen_ids:
                return
            seen_ids.add(user_id)
            scoped_users.append(user_obj)

        if project_obj:
            add_user(project_obj.assigned_sgm)
            add_user(project_obj.assigned_hqepl)
            add_user(project_obj.external_lead)

            for employee in project_obj.assigned_employees.select_related('user').all():
                add_user(employee.user)

            for external_member in project_obj.external_team.all():
                add_user(external_member)

            for senior_member in project_obj.senior_team.all():
                add_user(senior_member)

        if client_obj:
            for internal_member in client_obj.internal_team.all():
                add_user(internal_member)

            for sgm in client_obj.assigned_sgms.all():
                add_user(sgm)

            for hqepl in client_obj.assigned_hqepls.all():
                add_user(hqepl)

            for external_record in client_obj.external_members.select_related('user').all():
                add_user(external_record.user)

        return scoped_users

    def resolve_assignee_user(self, identifier, project_obj=None, client_obj=None):
        """
        Resolve assignee by exact, case-insensitive match.
        Matching order:
        1) email, 2) username, 3) shortform, 4) full name.

        If multiple users share the same normalized full name, return ambiguity so
        caller can draft the row for explicit selection.

        Returns:
            tuple(User|None, str|None)
            - (user, None) on success
            - (None, error_message) on failure/ambiguity
        """
        if not identifier or pd.isna(identifier):
            return None, "Assigned to value is missing"

        identifier_text = str(identifier).strip()
        normalized_identifier = self._normalize_lookup_text(identifier_text)

        scoped_users = self._build_scoped_candidate_users(project_obj=project_obj, client_obj=client_obj)
        user_pool = scoped_users if scoped_users else list(User.objects.all())

        def match_exact(pool, accessor):
            matches = []
            for user_obj in pool:
                value = accessor(user_obj)
                if self._normalize_lookup_text(value) == normalized_identifier:
                    matches.append(user_obj)
            return matches

        # 1) Email exact (case-insensitive)
        email_matches = match_exact(user_pool, lambda u: u.email)
        if len(email_matches) == 1:
            return email_matches[0], None
        if len(email_matches) > 1:
            return None, f"Assigned to '{identifier_text}' is ambiguous (multiple email matches)"

        # 2) Full-name exact (case-insensitive, whitespace-normalized)
        full_name_matches = match_exact(
            user_pool,
            lambda u: f"{u.first_name or ''} {u.last_name or ''}"
        )
        if len(full_name_matches) == 1:
            return full_name_matches[0], None
        if len(full_name_matches) > 1:
            return None, (
                f"Assigned to '{identifier_text}' is ambiguous "
                f"({len(full_name_matches)} users share this name)"
            )

        # 3) Username exact (case-insensitive)
        username_matches = match_exact(user_pool, lambda u: u.username)
        if len(username_matches) == 1:
            return username_matches[0], None
        if len(username_matches) > 1:
            return None, f"Assigned to '{identifier_text}' is ambiguous (multiple username matches)"

        # 4) Shortform exact (case-insensitive)
        shortform_matches = match_exact(user_pool, lambda u: getattr(u, 'shortform', ''))
        if len(shortform_matches) == 1:
            return shortform_matches[0], None
        if len(shortform_matches) > 1:
            return None, f"Assigned to '{identifier_text}' is ambiguous (multiple shortform matches)"

        # If we have project/client context, do NOT fall back globally.
        # This prevents assigning users outside the selected client/project scope.
        if project_obj or client_obj:
            context_label = project_obj.name if project_obj else client_obj.company_name
            return None, f"Assigned to user '{identifier_text}' is not part of '{context_label}'"

        return None, f"Assigned to user '{identifier_text}' not found"

    def build_draft_row(self, row, column_mapping, row_number, error_message, default_flag='none', default_priority='LOW', upload_date=None):
        task_title = ''
        client_value = ''
        project_value = ''
        assigned_to_value = ''
        if 'task' in column_mapping:
            try:
                task_title = str(row.iloc[column_mapping['task']]).strip()[:255]
            except Exception:
                task_title = ''

        if 'client' in column_mapping:
            try:
                raw = row.iloc[column_mapping['client']]
                client_value = '' if pd.isna(raw) else str(raw).strip()
            except Exception:
                client_value = ''

        if 'project' in column_mapping:
            try:
                raw = row.iloc[column_mapping['project']]
                project_value = '' if pd.isna(raw) else str(raw).strip()
            except Exception:
                project_value = ''

        if 'assigned_to' in column_mapping:
            try:
                raw = row.iloc[column_mapping['assigned_to']]
                assigned_to_value = '' if pd.isna(raw) else str(raw).strip()
            except Exception:
                assigned_to_value = ''

        description = ''
        if 'description' in column_mapping:
            try:
                desc_val = row.iloc[column_mapping['description']]
                if not pd.isna(desc_val):
                    description = str(desc_val).strip()
            except Exception:
                description = ''

        target_date = None

        if 'target_date' in column_mapping:
            try:
                date_val = row.iloc[column_mapping['target_date']]
                target_date = self.safe_to_datetime(date_val)
            except Exception as e:
                self.warnings.append(f"Row {row_number}: Date error - {str(e)}")

        if not target_date:
            target_date = upload_date or timezone.localdate()

        lowered_error = str(error_message or '').lower()
        error_fields = []
        if 'task' in lowered_error:
            error_fields.append('title')
        if 'client' in lowered_error:
            error_fields.append('client')
        if 'project' in lowered_error:
            error_fields.append('project')
        if 'assigned to' in lowered_error or 'assignee' in lowered_error or 'user' in lowered_error:
            error_fields.append('assigned_to')
        if 'date' in lowered_error or 'target_date' in lowered_error:
            error_fields.append('target_date')

        return {
            'row_number': row_number,
            'title': (task_title or f"Draft Task Row {row_number}")[:255],
            'client': client_value,
            'project': project_value,
            'assigned_to': assigned_to_value,
            'target_date': str(target_date),
            'description': description,
            'priority': default_priority,
            'flag': default_flag,
            'error': error_message,
            'error_fields': error_fields,
        }

    def get_or_find_project(self, project_name):
        """
        Find project by name. First tries exact match, then fuzzy matching.
        Handles None/empty values gracefully.
        """
        if not project_name or pd.isna(project_name):
            return None

        project_name = str(project_name).strip()
        normalized_name = self._normalize_lookup_text(project_name)

        def best_fuzzy_in_queryset(queryset):
            best_candidates = []
            best_distance = float('inf')
            for project in queryset:
                candidate_name = self._normalize_lookup_text(project.name)
                distance = self.calculate_edit_distance(normalized_name, candidate_name)
                if distance < best_distance:
                    best_distance = distance
                    best_candidates = [project]
                elif distance == best_distance:
                    best_candidates.append(project)

            tolerance = max(1, min(3, len(normalized_name) // 6))
            if best_distance <= tolerance:
                if len(best_candidates) == 1:
                    return best_candidates[0], best_distance, None
                return None, best_distance, (
                    f"Project '{project_name}' is ambiguous (multiple close matches)"
                )
            return None, best_distance, None

        exact_matches = list(Project.objects.filter(name__iexact=project_name).select_related('client'))
        if len(exact_matches) == 1:
            return exact_matches[0]
        if len(exact_matches) > 1:
            raise ValueError(
                f"Project '{project_name}' is ambiguous (matched {len(exact_matches)} projects). "
                f"Please provide a matching client."
            )

        # Try normalized exact match when DB value has extra spacing.
        normalized_exact = [
            project for project in Project.objects.select_related('client').all()
            if self._normalize_lookup_text(project.name) == normalized_name
        ]
        if len(normalized_exact) == 1:
            return normalized_exact[0]
        if len(normalized_exact) > 1:
            raise ValueError(
                f"Project '{project_name}' is ambiguous (matched {len(normalized_exact)} projects). "
                f"Please provide a matching client."
            )

        # Try fuzzy matching globally.
        best_match, distance, ambiguity_error = best_fuzzy_in_queryset(Project.objects.select_related('client').all())
        if best_match:
            print(f"DEBUG: Fuzzy matched project '{project_name}' to '{best_match.name}' (distance: {distance})")
            return best_match
        if ambiguity_error:
            raise ValueError(ambiguity_error)

        # No match found
        raise ValueError(f"Project '{project_name}' not found (no similar matches)")

    def get_or_find_project_for_client(self, project_name, client_obj=None):
        """
        Resolve a project name with client context first.
        This prevents false ambiguity when the same project name exists in different clients.
        """
        if not project_name or pd.isna(project_name):
            return None

        project_name = str(project_name).strip()
        normalized_name = self._normalize_lookup_text(project_name)

        if client_obj:
            scoped_qs = Project.objects.filter(client=client_obj).select_related('client')

            scoped_exact = list(scoped_qs.filter(name__iexact=project_name))
            if len(scoped_exact) == 1:
                return scoped_exact[0]
            if len(scoped_exact) > 1:
                active_exact = [project for project in scoped_exact if (project.status or '').upper() == 'ACTIVE']
                if len(active_exact) == 1:
                    return active_exact[0]
                raise ValueError(
                    f"Project '{project_name}' is ambiguous for client '{client_obj.company_name}' "
                    f"(matched {len(scoped_exact)} projects)"
                )

            scoped_normalized = [
                project for project in scoped_qs
                if self._normalize_lookup_text(project.name) == normalized_name
            ]
            if len(scoped_normalized) == 1:
                return scoped_normalized[0]
            if len(scoped_normalized) > 1:
                active_normalized = [project for project in scoped_normalized if (project.status or '').upper() == 'ACTIVE']
                if len(active_normalized) == 1:
                    return active_normalized[0]
                raise ValueError(
                    f"Project '{project_name}' is ambiguous for client '{client_obj.company_name}' "
                    f"(matched {len(scoped_normalized)} projects)"
                )

            # Scoped fuzzy fallback.
            best_match = None
            best_distance = float('inf')
            tie_count = 0
            tolerance = max(1, min(3, len(normalized_name) // 6))
            for project in scoped_qs:
                candidate_name = self._normalize_lookup_text(project.name)
                distance = self.calculate_edit_distance(normalized_name, candidate_name)
                if distance < best_distance:
                    best_distance = distance
                    best_match = project
                    tie_count = 1
                elif distance == best_distance:
                    tie_count += 1

            if best_match and best_distance <= tolerance:
                if tie_count == 1:
                    print(
                        f"DEBUG: Fuzzy matched project '{project_name}' to '{best_match.name}' "
                        f"within client '{client_obj.company_name}' (distance: {best_distance})"
                    )
                    return best_match
                raise ValueError(
                    f"Project '{project_name}' is ambiguous for client '{client_obj.company_name}' "
                    f"(multiple close matches)"
                )

            raise ValueError(
                f"Project '{project_name}' not found for client '{client_obj.company_name}'"
            )

        # No client context provided: fall back to global resolver.
        return self.get_or_find_project(project_name)

    def get_or_find_client(self, client_name):
        """
        Find client by company_name. First tries exact match, then fuzzy matching.
        Handles None/empty values gracefully.
        """
        if not client_name or pd.isna(client_name):
            return None

        client_name = str(client_name).strip()
        normalized_name = self._normalize_lookup_text(client_name)

        # Try exact match first
        exact_matches = list(Client.objects.filter(company_name__iexact=client_name))
        if len(exact_matches) == 1:
            return exact_matches[0]
        if len(exact_matches) > 1:
            self.warnings.append(
                f"Client '{client_name}' matched multiple records; using first match."
            )
            return sorted(exact_matches, key=lambda c: c.id)[0]

        normalized_matches = [
            client for client in Client.objects.all()
            if self._normalize_lookup_text(client.company_name) == normalized_name
        ]
        if len(normalized_matches) == 1:
            return normalized_matches[0]
        if len(normalized_matches) > 1:
            self.warnings.append(
                f"Client '{client_name}' matched multiple normalized records; using first match."
            )
            return sorted(normalized_matches, key=lambda c: c.id)[0]
        
        # Try fuzzy matching
        best_match, distance = self.find_best_client_match(client_name)
        if best_match:
            print(f"DEBUG: Fuzzy matched client '{client_name}' to '{best_match.company_name}' (distance: {distance})")
            return best_match
        
        # No match found
        raise ValueError(f"Client '{client_name}' not found (no similar matches)")

    def process_row(self, row, column_mapping, row_number, assigned_by, default_flag='none', default_priority='LOW', upload_date=None):
        """
        Process a single row from Excel and create Task object (not saved yet).
        
        Args:
            row: pandas Series (Excel row)
            column_mapping: dict mapping field names to column indices
            row_number: Excel row number (for error reporting)
            assigned_by: User who created this task
            
        Returns:
            Task object (not saved) or raises error
        """
        try:
            print(f"DEBUG Row {row_number}: Starting to process")
            print(f"DEBUG Row {row_number}: column_mapping = {column_mapping}")
            print(f"DEBUG Row {row_number}: row data = {row.to_dict()}")

            row_issues = []
            
            # Extract and validate task title (required)
            task_title_col = column_mapping.get('task')
            if task_title_col is None:
                raise ValueError("Task title column not found")
            
            task_title = str(row.iloc[task_title_col]).strip()[:255]
            print(f"DEBUG Row {row_number}: task_title = {task_title}")
            if not task_title or pd.isna(task_title):
                raise ValueError("Task title is empty")

            # Extract optional fields
            client_name = None
            client_obj = None
            project_obj = None
            project_name = None
            assigned_to_user = None
            target_date = None
            description = ""
            
            print(f"DEBUG Row {row_number}: Extracting optional fields...")

            # Client (optional)
            if 'client' in column_mapping:
                try:
                    client_val = row.iloc[column_mapping['client']]
                    print(f"DEBUG Row {row_number}: client value = {client_val}")
                    client_obj = self.get_or_find_client(client_val)
                    if client_obj:
                        client_name = client_obj.company_name
                        print(f"DEBUG Row {row_number}: Found client = {client_name}")
                    else:
                        row_issues.append("Client not found")
                except Exception as e:
                    print(f"DEBUG Row {row_number}: Client error - {str(e)}")
                    self.warnings.append(f"Row {row_number}: Client error - {str(e)}")
                    row_issues.append(f"Client error - {str(e)}")

            # Project (optional)
            if 'project' in column_mapping:
                try:
                    project_val = row.iloc[column_mapping['project']]
                    print(f"DEBUG Row {row_number}: project value = {project_val}")
                    project_obj = self.get_or_find_project_for_client(project_val, client_obj=client_obj)
                    if project_obj:
                        project_name = project_obj.name
                        print(f"DEBUG Row {row_number}: Found project = {project_name}")
                    else:
                        row_issues.append("Project not found")
                except Exception as e:
                    print(f"DEBUG Row {row_number}: Project error - {str(e)}")
                    self.warnings.append(f"Row {row_number}: Project error - {str(e)}")
                    row_issues.append(f"Project error - {str(e)}")

            # Assigned To (optional, defaults to assigned_by)
            if 'assigned_to' in column_mapping:
                assignee_val = row.iloc[column_mapping['assigned_to']]
                is_empty = pd.isna(assignee_val) or (isinstance(assignee_val, str) and assignee_val.strip() == '')
                is_nan = pd.isna(assignee_val)
                
                print(f"\nDEBUG Row {row_number}: ===== ASSIGNED TO PROCESSING =====")
                print(f"  Raw value: {repr(assignee_val)}")
                print(f"  Is NaN: {is_nan}")
                print(f"  Is empty string: {isinstance(assignee_val, str) and assignee_val.strip() == ''}")
                print(f"  Is empty (overall): {is_empty}")
                
                if not is_empty:
                    assignee_str = str(assignee_val).strip()
                    print(f"  Processed value: '{assignee_str}'")
                    print(f"  Looking up user...")
                    assigned_to_user, assignee_error = self.resolve_assignee_user(
                        assignee_str,
                        project_obj=project_obj,
                        client_obj=client_obj,
                    )
                    if assigned_to_user:
                        print(f"  ✓ SUCCESS: Found user = {assigned_to_user.email} (ID: {assigned_to_user.id})")
                    else:
                        # Email was provided but user not found - this is an ERROR
                        print(f"  ✗ ERROR: User not found for '{assignee_str}'")
                        row_issues.append(assignee_error or f"Assigned to user '{assignee_str}' not found")
                else:
                    print(f"  Column exists but is empty/NaN - will use default (assigned_by)")
                    row_issues.append("Assigned to value is missing")
            else:
                print(f"\nDEBUG Row {row_number}: ===== ASSIGNED TO PROCESSING =====")
                print(f"  'assigned_to' column NOT found in mapping")
            
            if not assigned_to_user:
                print(f"  Using default: current user (assigned_by) = {assigned_by.email} (ID: {assigned_by.id})")
                assigned_to_user = assigned_by
            
            # Final verification
            print(f"\nDEBUG Row {row_number}: FINAL ASSIGNMENT")
            print(f"  Task assigned TO:   {assigned_to_user.email} (ID: {assigned_to_user.id})")
            print(f"  Task assigned BY:   {assigned_by.email} (ID: {assigned_by.id})")
            print(f"  Same person: {assigned_to_user.id == assigned_by.id}")
            print(f"========================================\n")

            # Target Date (optional, defaults to today)
            if 'target_date' in column_mapping:
                try:
                    date_val = row.iloc[column_mapping['target_date']]
                    target_date = self.safe_to_datetime(date_val)
                except Exception as e:
                    self.warnings.append(f"Row {row_number}: Date error - {str(e)}")
            
            if not target_date:
                target_date = datetime.now().date()

            # Description (optional)
            if 'description' in column_mapping:
                desc_val = row.iloc[column_mapping['description']]
                if not pd.isna(desc_val):
                    description = str(desc_val).strip()

            if row_issues:
                raise ValueError('; '.join(row_issues))

            # All imported tasks use the upload date as start_date.
            task_start_date = upload_date or timezone.localdate()

            # Create Task object (not saved yet)
            task = Task(
                title=task_title,
                description=description,
                project=project_obj,
                client_org=client_obj if 'client' in column_mapping else None,
                assigned_to=assigned_to_user,
                assigned_by=assigned_by,
                start_date=task_start_date,
                target_date=target_date,
                status='In Progress',
                priority=default_priority,
                flag=default_flag,
                is_repeatable=False,
                source_module='EXCEL_IMPORT'
            )

            return task

        except Exception as e:
            raise ValueError(f"Row {row_number} error: {str(e)}")

    def import_tasks(self, file_path, assigned_by, column_mapping=None, default_flag='none', default_priority='LOW'):
        """
        Main import function: Read Excel file and create tasks.
        
        Args:
            file_path: Path to .xlsx file
            assigned_by: Django User object who is creating the tasks
            column_mapping: Optional manual mapping from frontend 
                           Format: {column_index: field_name} or {field_name: column_index}
            
        Returns:
            dict with:
                - 'success': bool
                - 'tasks_created': int
                - 'errors': list
                - 'warnings': list
        """
        self.errors = []
        self.warnings = []
        self.created_tasks = []
        self.draft_rows = []
        upload_date = timezone.localdate()

        allowed_flags = {choice[0] for choice in Task.FLAG_CHOICES}
        allowed_priorities = {choice[0] for choice in Task.PRIORITY_CHOICES}

        normalized_flag = str(default_flag or 'none').strip().lower()
        normalized_priority = str(default_priority or 'LOW').strip().upper()

        if normalized_flag not in allowed_flags:
            self.warnings.append(f"Invalid flag '{default_flag}' provided. Falling back to 'none'.")
            normalized_flag = 'none'

        if normalized_priority not in allowed_priorities:
            self.warnings.append(f"Invalid priority '{default_priority}' provided. Falling back to 'LOW'.")
            normalized_priority = 'LOW'

        try:
            # Read Excel file
            df = self.read_excel(file_path)

            # Find column mapping
            if column_mapping:
                # Use provided mapping from frontend
                print(f"DEBUG: Using provided column mapping: {column_mapping}")
                
                # Convert mapping format if needed
                # Frontend sends: { 0: 'task', 1: 'assigned_to', 2: 'target_date' }
                # We need: { 'task': 0, 'assigned_to': 1, 'target_date': 2 }
                provided_mapping = column_mapping
                field_to_idx = {}
                
                for key, value in provided_mapping.items():
                    # Check if key is string (already field_name) or int (column_index)
                    try:
                        col_idx = int(key)
                        # key is column index, value is field name
                        if value:  # Skip if value is empty/None/Skip
                            field_to_idx[value] = col_idx
                    except (ValueError, TypeError):
                        # key is field name, value is column index
                        if value is not None:
                            field_to_idx[key] = value
                
                # Validate required field 'task'
                if 'task' not in field_to_idx:
                    return {
                        'success': False,
                        'tasks_created': 0,
                        'errors': ["Required 'Task' column not mapped"],
                        'warnings': []
                    }
                
                column_mapping = field_to_idx
            else:
                # Auto-detect column mapping
                try:
                    column_mapping = self.find_column_mapping(df.columns.tolist())
                except ValueError as e:
                    return {
                        'success': False,
                        'tasks_created': 0,
                        'errors': [str(e)],
                        'warnings': []
                    }

            # Process each row
            for idx, (row_idx, row) in enumerate(df.iterrows(), start=2):  # Start at row 2 (skip header)
                try:
                    task = self.process_row(
                        row,
                        column_mapping,
                        row_idx,
                        assigned_by,
                        default_flag=normalized_flag,
                        default_priority=normalized_priority,
                        upload_date=upload_date,
                    )
                    task.save()  # Save the task
                    self.created_tasks.append(task)
                    print(f"✓ Row {idx}: Task created successfully - {task.title}")
                except Exception as e:
                    error_msg = f"Row {idx}: {str(e)}"
                    self.errors.append(error_msg)
                    print(f"✗ {error_msg}")

                    try:
                        draft_row = self.build_draft_row(
                            row,
                            column_mapping,
                            row_idx,
                            error_message=error_msg,
                            default_flag=normalized_flag,
                            default_priority=normalized_priority,
                            upload_date=upload_date,
                        )
                        self.draft_rows.append(draft_row)
                        print(f"↳ Row {idx}: Draft row prepared")
                    except Exception as draft_error:
                        draft_msg = f"Row {idx}: Draft creation failed - {str(draft_error)}"
                        self.warnings.append(draft_msg)
                        print(f"✗ {draft_msg}")

            tasks_created_count = len(self.created_tasks)
            drafts_created_count = len(self.draft_rows)
            # Treat draft creation as a successful import outcome to avoid hard-failing the request.
            success = (tasks_created_count + drafts_created_count) > 0

            return {
                'success': success,
                'tasks_created': tasks_created_count,
                'drafts_created': drafts_created_count,
                'partial_success': drafts_created_count > 0 and tasks_created_count == 0,
                'errors': self.errors,
                'warnings': self.warnings,
                'task_ids': [t.task_id for t in self.created_tasks],
                'draft_rows': self.draft_rows,
            }

        except Exception as e:
            return {
                'success': False,
                'tasks_created': 0,
                'errors': [f"Import failed: {str(e)}"],
                'warnings': self.warnings
            }
