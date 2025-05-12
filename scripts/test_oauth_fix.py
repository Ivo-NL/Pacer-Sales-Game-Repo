import os
import sys
import re

"""
Script to analyze and fix FastAPI imports to solve OAuth2PasswordRequestForm issue
"""

def analyze_import_pattern(file_content):
    """Analyze the import pattern in the file to determine structure."""
    imports = re.findall(r'from\s+.*?\s+import\s+.*?$', file_content, re.MULTILINE)
    relative_imports = re.findall(r'from\s+\.\s+import\s+.*?$', file_content, re.MULTILINE)
    
    print(f"Found {len(imports)} import statements")
    for imp in imports[:10]:  # Show first 10 imports
        print(f"  - {imp}")
    
    print(f"\nFound {len(relative_imports)} relative imports:")
    for imp in relative_imports:
        print(f"  - {imp}")
    
    # Look for module imports
    modules = re.findall(r'from\s+\.([a-zA-Z0-9_]+)\s+import', file_content)
    if modules:
        print("\nImported modules from current package:")
        for module in set(modules):
            print(f"  - {module}")
    
    # Look for direct imports
    direct_imports = re.findall(r'import\s+([a-zA-Z0-9_., ]+)', file_content)
    if direct_imports:
        print("\nDirect imports:")
        for imp in direct_imports:
            print(f"  - {imp}")

def create_fixed_import(file_content):
    """Create a fixed version of the file with OAuth2PasswordRequestForm import."""
    # Find if there's any existing FastAPI security import
    security_import = re.search(r'from\s+fastapi\.security\s+import\s+.*?$', file_content, re.MULTILINE)
    
    # Find existing relative imports structure
    relative_imports = re.findall(r'from\s+\.\s+import\s+([a-zA-Z0-9_, ]+)', file_content)
    relative_import_modules = []
    if relative_imports:
        for imp in relative_imports:
            relative_import_modules.extend([m.strip() for m in imp.split(',')])
    
    print(f"Relative import modules: {relative_import_modules}")
    
    # Find all FastAPI imports
    fastapi_imports = re.findall(r'from\s+fastapi(?:\.[a-zA-Z0-9_]+)?\s+import\s+.*?$', file_content, re.MULTILINE)
    
    print("\nFastAPI imports:")
    for imp in fastapi_imports:
        print(f"  - {imp}")
    
    # Create a fixed version keeping the same structure
    print("\nCreating fixed version...")
    
    if security_import:
        # Add OAuth2PasswordRequestForm to existing security import
        print("Found existing security import, adding OAuth2PasswordRequestForm")
        imported_items = re.search(r'import\s+([a-zA-Z0-9_, ]+)', security_import.group(0)).group(1)
        if 'OAuth2PasswordRequestForm' not in imported_items:
            new_import = security_import.group(0).replace(
                imported_items, 
                f"{imported_items}, OAuth2PasswordRequestForm"
            )
            file_content = file_content.replace(security_import.group(0), new_import)
    else:
        # Add new security import near other FastAPI imports
        if fastapi_imports:
            print("Adding new security import after existing FastAPI imports")
            last_import = fastapi_imports[-1]
            new_import = f"{last_import}\nfrom fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm"
            file_content = file_content.replace(last_import, new_import)
        else:
            print("No FastAPI imports found, adding at the beginning")
            file_content = "from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm\n" + file_content
    
    return file_content

def test_imports():
    """Test various import formats to see which ones work."""
    imports_to_test = [
        "from fastapi.security import OAuth2PasswordRequestForm",
        "from fastapi.security.oauth2 import OAuth2PasswordRequestForm",
        "from fastapi import OAuth2PasswordRequestForm",
        "from fastapi import security",
        "import fastapi.security"
    ]
    
    for imp in imports_to_test:
        try:
            exec(imp)
            print(f"✅ Success: {imp}")
        except ImportError as e:
            print(f"❌ Failed: {imp} - {str(e)}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_oauth_fix.py <path_to_main.py>")
        print("Running in test mode...")
        test_imports()
        return
    
    main_file = sys.argv[1]
    if not os.path.exists(main_file):
        print(f"Error: File {main_file} does not exist")
        return
    
    with open(main_file, 'r') as f:
        content = f.read()
    
    print(f"Analyzing {main_file}...")
    analyze_import_pattern(content)
    
    fixed_content = create_fixed_import(content)
    
    # Write to a new file for comparison
    fixed_file = f"{main_file}.fixed"
    with open(fixed_file, 'w') as f:
        f.write(fixed_content)
    
    print(f"\nFixed version written to {fixed_file}")
    print("Run a diff to compare the changes:")
    print(f"diff {main_file} {fixed_file}")

if __name__ == "__main__":
    main() 