import ast
import io
import json
import sys
import unittest
import zipfile
sys.dont_write_bytecode = True
from analyze_sources import analyze_entry, attach_dependencies, python_contract, structure_contract


class SourceAnalysisTests(unittest.TestCase):
    def test_parsing_never_executes_module_actions(self):
        contract = analyze_entry('scripts/danger.py', b'raise RuntimeError("must not execute")\n')
        self.assertIn('Raise', contract['behavior'])
        self.assertEqual(contract['kind'], 'generate')

    def test_match_guards_and_fallbacks_are_explicit(self):
        contract = python_contract('scripts/route.py', 'def route(value):\n match value:\n  case "create" if value:\n   return 1\n  case _:\n   return 0\n')
        self.assertEqual(contract['untranslated'], [])
        self.assertIn('first matching case whose guard succeeds', contract['behavior'])
        self.assertIn('any remaining value', contract['behavior'])

    def test_unknown_match_pattern_stays_flagged(self):
        contract = python_contract('scripts/route.py', 'def route(value):\n match value:\n  case [first, *rest]:\n   return first\n')
        self.assertIn('MatchSequence', contract['untranslated'])

    def test_html_inventory_preserves_labels_without_copying_scripts(self):
        contract = analyze_entry('screens/form.html', b'<html><body><label>Name</label><button onclick="danger()">Submit</button><script>secret_code()</script></body></html>')
        self.assertIn('Name', contract['behavior'])
        self.assertIn('Submit', contract['behavior'])
        self.assertNotIn('secret_code()', contract['behavior'])
        self.assertNotIn('danger()', contract['behavior'])
        self.assertNotIn('<html>', contract['behavior'])
        self.assertTrue(contract['untranslated'])

    def test_json_csv_and_binary_are_retained_as_assets(self):
        contract = structure_contract('assets/config.json', b'{"task":{"id":"T1"},"records":[{"limit":10}]}')
        self.assertIn('observed_item_shapes', contract['structure'])
        self.assertIn('limit', contract['structure'])
        table = structure_contract('assets/records.csv', b'Name,Category,Status\nRecord,Sample,Complete\n')
        self.assertIn('["Name", "Category", "Status"]', table['structure'])
        self.assertEqual(structure_contract('assets/blob.bin',bytes([0,255,128]))['kind'], 'retain')

    def test_workbook_is_inventoried_without_changing_bytes(self):
        content = io.BytesIO()
        with zipfile.ZipFile(content,'w') as archive:
            archive.writestr('xl/workbook.xml','<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="Records" sheetId="1"/></sheets></workbook>')
            archive.writestr('xl/worksheets/sheet1.xml','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Name</t></is></c></row><row r="2"><c r="A2"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>')
        before = content.getvalue()
        contract = structure_contract('assets/records.xlsx',before)
        self.assertIn('Records', contract['structure'])
        self.assertIn('1 formulas', contract['structure'])
        self.assertEqual(content.getvalue(), before)

    def test_transitive_module_and_schema_dependencies_resolve(self):
        sources={'scripts/main.py':b'from helpers import work\n','scripts/helpers/__init__.py':b'from .ops import work\n','scripts/helpers/ops.py':b'def work(): pass\n','schemas/a.xsd':b'<schema><include schemaLocation="b.xsd"/></schema>','schemas/b.xsd':b'<schema/>'}
        entries=attach_dependencies([analyze_entry(path,data) for path,data in sources.items()],sources)
        by_path={entry['sourcePath']:entry for entry in entries}
        self.assertEqual(by_path['scripts/main.py']['dependencies'],['scripts/helpers/__init__.py'])
        self.assertEqual(by_path['scripts/helpers/__init__.py']['dependencies'],['scripts/helpers/ops.py'])
        self.assertEqual(by_path['schemas/a.xsd']['dependencies'],['schemas/b.xsd'])

    def test_nested_operations_are_counted_and_embedded_code_stays_flagged(self):
        source = 'class Record:\n def outer(self):\n  def inner(value):\n   return value + 1\n  return inner(1)\n async def read(self):\n  return 2\n'
        contract = python_contract('scripts/records.py', source)
        expected = sum(isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) for node in ast.walk(ast.parse(source)))
        self.assertEqual(contract['functionCount'], expected)
        self.assertEqual(expected, 3)
        self.assertFalse(contract['untranslated'])
        native = python_contract('scripts/native.py', 'code = "#include <demo.h>\\nint demo() { return 0; }"\n')
        self.assertTrue(any('Embedded native' in gap for gap in native['untranslated']))
        self.assertNotIn('#include', native['behavior'])
        macro = python_contract('scripts/macro.py', 'code = "<script:module>Sub Demo()\\nEnd Sub</script:module>"\n')
        self.assertTrue(any('Embedded macro' in gap for gap in macro['untranslated']))
        self.assertNotIn('Sub Demo()', macro['behavior'])


if __name__=='__main__': unittest.main()
