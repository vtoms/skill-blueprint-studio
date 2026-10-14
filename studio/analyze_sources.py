"""Read source files as data and draft English behavior contracts. Never import them."""
import ast
import base64
import csv
import hashlib
import io
import json
from pathlib import Path
from pathlib import PurePosixPath
import sys
import xml.etree.ElementTree as ET
import zipfile
from html.parser import HTMLParser





class English:
    def __init__(self):
        self.unhandled = set()
        self.count = 0

    def expr(self, n):
        if n is None:
            return 'no value'
        if isinstance(n, ast.Name):
            return '`' + n.id + '`'
        if isinstance(n, ast.Constant):
            v = n.value
            if v is None: return 'no value'
            if v is True: return 'true'
            if v is False: return 'false'
            if isinstance(v, bytes): return 'the byte sequence ' + v.hex()
            if isinstance(v, str):
                if '#include' in v and ('{' in v or ';' in v):
                    self.unhandled.add('Embedded native code requires an English specification')
                    return 'an embedded native implementation whose behavior requires a separate English specification'
                if '<script:module' in v and ('Sub ' in v or 'Function ' in v):
                    self.unhandled.add('Embedded macro code requires an English specification')
                    return 'an embedded macro implementation whose behavior requires a separate English specification'
                return json.dumps(v, ensure_ascii=False)
            return str(v)
        if isinstance(n, ast.Attribute): return self.expr(n.value) + ' → ' + n.attr
        if isinstance(n, ast.Call):
            args = [self.expr(a) for a in n.args]
            args += [('expand named arguments from ' + self.expr(k.value)) if k.arg is None else (k.arg + ': ' + self.expr(k.value)) for k in n.keywords]
            return 'invoke ' + self.expr(n.func) + ' with ' + ('; '.join(args) if args else 'no arguments')
        if isinstance(n, ast.Subscript): return 'the item of ' + self.expr(n.value) + ' at ' + self.expr(n.slice)
        if isinstance(n, ast.Slice): return 'slice from ' + self.expr(n.lower) + ' up to, excluding, ' + self.expr(n.upper) + ', using stride ' + self.expr(n.step)
        if isinstance(n, (ast.List, ast.Tuple, ast.Set)):
            kind = 'list' if isinstance(n, ast.List) else 'tuple' if isinstance(n, ast.Tuple) else 'set'
            return 'a ' + kind + ' containing [' + '; '.join(self.expr(x) for x in n.elts) + ']'
        if isinstance(n, ast.Dict): return 'a mapping containing [' + '; '.join(('expand ' + self.expr(v)) if k is None else self.expr(k) + ' maps to ' + self.expr(v) for k, v in zip(n.keys, n.values)) + ']'
        if isinstance(n, ast.BinOp):
            operators = {ast.Add:'add numbers or concatenate sequences, according to operand type, with', ast.Sub:'subtract numbers or take set difference, according to operand type, with', ast.Mult:'multiply numbers or repeat a sequence, according to operand type, by', ast.Div:'divide numbers or join filesystem path components, according to operand type, with', ast.FloorDiv:'floor-divide', ast.Mod:'apply remainder or string-format substitution, according to operand type', ast.Pow:'raise to the power', ast.BitAnd:'bitwise AND or set intersection, according to operand type, with', ast.BitOr:'bitwise OR, set union or mapping merge, according to operand type, with', ast.BitXor:'bitwise XOR or set symmetric difference, according to operand type, with', ast.LShift:'shift left', ast.RShift:'shift right', ast.MatMult:'matrix multiply'}
            return '(' + self.expr(n.left) + ': ' + operators.get(type(n.op), 'unsupported operator') + ' ' + self.expr(n.right) + ')'
        if isinstance(n, ast.UnaryOp): return {ast.Not:'logical negation of ', ast.USub:'negative of ', ast.UAdd:'positive of ', ast.Invert:'bitwise inversion of '}[type(n.op)] + self.expr(n.operand)
        if isinstance(n, ast.BoolOp):
            return ('the first truthy item, otherwise the last item, evaluated left to right, from [' if isinstance(n.op, ast.Or) else 'the first falsy item, otherwise the last item, evaluated left to right, from [') + '; '.join(self.expr(x) for x in n.values) + ']'
        if isinstance(n, ast.Compare):
            names = {ast.Eq:'equals', ast.NotEq:'does not equal', ast.Lt:'is less than', ast.LtE:'is at most', ast.Gt:'is greater than', ast.GtE:'is at least', ast.In:'is a member of', ast.NotIn:'is not a member of', ast.Is:'is the identical object as', ast.IsNot:'is not the identical object as'}
            operands = [n.left] + n.comparators
            return ' and '.join(self.expr(operands[i]) + ' ' + names[type(op)] + ' ' + self.expr(operands[i + 1]) for i, op in enumerate(n.ops))
        if isinstance(n, ast.IfExp): return self.expr(n.body) + ' when ' + self.expr(n.test) + ', otherwise ' + self.expr(n.orelse)
        if isinstance(n, ast.JoinedStr): return 'text formed by joining [' + '; '.join(self.expr(x) for x in n.values) + '] in order'
        if isinstance(n, ast.FormattedValue):
            conversion = {114:'representation', 115:'text', 97:'ASCII representation'}.get(n.conversion, 'value')
            return conversion + ' of ' + self.expr(n.value) + (', with format ' + self.expr(n.format_spec) if n.format_spec else '')
        if isinstance(n, ast.Starred): return 'expand positional items from ' + self.expr(n.value)
        if isinstance(n, (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)):
            kind = {ast.ListComp:'list', ast.SetComp:'set', ast.DictComp:'mapping', ast.GeneratorExp:'lazy iterator'}[type(n)]
            value = self.expr(n.key) + ' maps to ' + self.expr(n.value) if isinstance(n, ast.DictComp) else self.expr(n.elt)
            loops = ['for each ' + self.expr(g.target) + ' in ' + self.expr(g.iter) + (', keeping only items for which ' + ' and '.join(self.expr(x) for x in g.ifs) if g.ifs else '') for g in n.generators]
            return 'a ' + kind + ' of ' + value + ', ' + '; then '.join(loops)
        if isinstance(n, ast.Lambda): return 'an inline function accepting ' + ', '.join(a.arg for a in n.args.args) + ' and returning ' + self.expr(n.body)
        if isinstance(n, ast.NamedExpr): return 'assign ' + self.expr(n.value) + ' to ' + self.expr(n.target) + ' and use that assigned value'
        if isinstance(n, (ast.Yield, ast.YieldFrom)): return ('yield each item from ' if isinstance(n, ast.YieldFrom) else 'yield ') + self.expr(n.value)
        if isinstance(n, ast.Await): return 'await completion of ' + self.expr(n.value)
        self.unhandled.add(type(n).__name__)
        return '[Requires explicit translation: ' + type(n).__name__ + ']'

    def block(self, nodes, depth=0):
        lines = []
        def emit(text): lines.append('  ' * depth + '- ' + text)
        for n in nodes:
            self.count += 1
            if isinstance(n, ast.Expr) and isinstance(n.value, ast.Constant) and isinstance(n.value.value, str): continue
            if isinstance(n, ast.Assign): emit('Evaluate ' + self.expr(n.value) + ' once; assign the result to ' + ', '.join(self.expr(t) for t in n.targets) + ' in order.')
            elif isinstance(n, ast.AnnAssign): emit('Declare ' + self.expr(n.target) + (' with value ' + self.expr(n.value) if n.value is not None else ' without an initial value') + '.')
            elif isinstance(n, ast.AugAssign): emit('Update ' + self.expr(n.target) + ' using ' + self.expr(ast.BinOp(left=n.target, op=n.op, right=n.value)) + '.')
            elif isinstance(n, ast.Expr): emit('Perform ' + self.expr(n.value) + '.')
            elif isinstance(n, ast.Return): emit('Return ' + self.expr(n.value) + ' and stop this operation.')
            elif isinstance(n, ast.If):
                emit('When ' + self.expr(n.test) + ':'); lines += self.block(n.body, depth + 1)
                if n.orelse: emit('Otherwise:'); lines += self.block(n.orelse, depth + 1)
            elif isinstance(n, ast.Match):
                emit('Evaluate ' + self.expr(n.subject) + ' once; take the first matching case whose guard succeeds:')
                for case in n.cases:
                    pattern = case.pattern
                    if isinstance(pattern, ast.MatchValue): condition = 'the value equals ' + self.expr(pattern.value)
                    elif isinstance(pattern, ast.MatchAs) and pattern.pattern is None: condition = 'any remaining value' + (', binding it to ' + pattern.name if pattern.name else '')
                    else:
                        self.unhandled.add(type(pattern).__name__)
                        condition = 'requires explicit pattern translation: ' + type(pattern).__name__
                    lines.append('  ' * (depth + 1) + '- Case: ' + condition + (', and ' + self.expr(case.guard) if case.guard else '') + ':')
                    lines += self.block(case.body, depth + 2)
            elif isinstance(n, (ast.For, ast.AsyncFor, ast.While)):
                emit(('For each ' + self.expr(n.target) + ' in ' + self.expr(n.iter) if hasattr(n, 'target') else 'While ' + self.expr(n.test)) + ':'); lines += self.block(n.body, depth + 1)
                if n.orelse: emit('After normal loop completion without an early break:'); lines += self.block(n.orelse, depth + 1)
            elif isinstance(n, (ast.With, ast.AsyncWith)):
                emit('Enter these managed resources: ' + '; '.join(self.expr(i.context_expr) + (', binding the entered value to ' + self.expr(i.optional_vars) if i.optional_vars else '') for i in n.items) + '. Ensure the matching context exit on completion or failure.'); lines += self.block(n.body, depth + 1)
            elif isinstance(n, ast.Try):
                emit('Attempt:'); lines += self.block(n.body, depth + 1)
                for h in n.handlers: emit('If ' + (self.expr(h.type) if h.type else 'any exception') + ' occurs' + (', bound to ' + h.name if h.name else '') + ':'); lines += self.block(h.body, depth + 1)
                if n.orelse: emit('If the attempted block completes without exception:'); lines += self.block(n.orelse, depth + 1)
                if n.finalbody: emit('In all cases, before leaving the attempt:'); lines += self.block(n.finalbody, depth + 1)
            elif isinstance(n, ast.Raise): emit(('Raise ' + self.expr(n.exc) + (' with cause ' + self.expr(n.cause) if n.cause else '') if n.exc else 'Propagate the current exception') + '.')
            elif isinstance(n, ast.Assert): emit('Require ' + self.expr(n.test) + '; fail with an assertion' + (' whose message is ' + self.expr(n.msg) if n.msg else '') + ' if false.')
            elif isinstance(n, ast.Break): emit('Stop the nearest enclosing loop immediately, bypassing its normal-completion block.')
            elif isinstance(n, ast.Continue): emit('Skip the remaining actions in this iteration and continue the nearest loop.')
            elif isinstance(n, ast.Pass): emit('Take no action.')
            elif isinstance(n, ast.Delete): emit('Remove ' + ', '.join(self.expr(t) for t in n.targets) + '.')
            elif isinstance(n, (ast.Global, ast.Nonlocal)): emit('Resolve these names in ' + ('module scope: ' if isinstance(n, ast.Global) else 'the enclosing function scope: ') + ', '.join(n.names) + '.')
            elif isinstance(n, ast.Import): emit('Make these modules available: ' + ', '.join(a.name + (' as ' + a.asname if a.asname else '') for a in n.names) + '.')
            elif isinstance(n, ast.ImportFrom): emit('Use ' + ', '.join(a.name + (' as ' + a.asname if a.asname else '') for a in n.names) + ' from ' + ('.' * n.level + (n.module or '')) + '.')
            elif isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                emit('Provide the operation ' + n.name + ' defined below' + (', applying decorators ' + ', '.join(self.expr(d) for d in n.decorator_list) if n.decorator_list else '') + '.')
            elif isinstance(n, ast.ClassDef):
                emit('Provide the object type ' + n.name + (', derived from ' + ', '.join(self.expr(b) for b in n.bases) if n.bases else '') + ', with these class-scope actions:'); lines += self.block(n.body, depth + 1)
            else: self.unhandled.add(type(n).__name__); emit('Requires explicit translation: ' + type(n).__name__ + '.')
        return lines


def python_contract(path, content):
    tree = ast.parse(content, filename=path)
    english = English()
    functions = []
    def walk(nodes, prefix=''):
        for n in nodes:
            if isinstance(n, ast.ClassDef): walk(n.body, prefix + n.name + '.')
            elif isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
                positional = n.args.posonlyargs + n.args.args
                defaults = [None] * (len(positional) - len(n.args.defaults)) + n.args.defaults
                parameters = [a.arg + ('; declared type: ' + english.expr(a.annotation) if a.annotation else '') + ('; positional only' if a in n.args.posonlyargs else '') + ('; default: ' + english.expr(d) if d is not None else '; required') for a, d in zip(positional, defaults)]
                parameters += [a.arg + ('; default: ' + english.expr(d) if d is not None else '; required named argument') for a, d in zip(n.args.kwonlyargs, n.args.kw_defaults)]
                if n.args.vararg: parameters.append(n.args.vararg.arg + '; remaining positional arguments')
                if n.args.kwarg: parameters.append(n.args.kwarg.arg + '; remaining named arguments')
                functions.append({'name': prefix + n.name, 'start': n.lineno, 'end': n.end_lineno, 'inputs': parameters, 'doc': ast.get_docstring(n) or '', 'behavior': '\n'.join(english.block(n.body))})
                walk(n.body, prefix + n.name + '.')
    walk(tree.body)
    module_behavior = '\n'.join(english.block(tree.body))
    purpose = 'Reproduce the operations declared by ' + path + ' using the reviewed input, output and behavior contracts.'
    behavior = '## Module setup\n\n' + module_behavior + '\n\n' + '\n\n'.join('## Operation: ' + f['name'] + '\n\nInputs:\n' + ('\n'.join('- ' + a for a in f['inputs']) or '- None.') + '\n\nBehavior:\n' + f['behavior'] for f in functions)
    return {'kind':'generate','purpose':purpose,'inputs':'Use the operation inputs and command-line arguments listed in the behavior contract. Preserve required arguments, optional defaults, and interface names.','outputs':'Generate ' + path + ' in the runtime workspace. Its callable operations, command interface, return values, diagnostics, and side effects must follow this specification.','behavior':behavior,'errors':'Preserve the exception and diagnostic behavior specified by each operation. Do not replace a failed validation or unavailable converter with a successful result. Do not alter input files outside the specified mutation paths.','checks':'Before use, verify syntax and required imports. Exercise the declared input defaults, every error path, and boundary conditions. Verify file writes, return values, and process exit outcomes. Compare observed results with the operation contract. Record test failures explicitly; do not assume this draft proves runtime equivalence.','functionCount':len(functions),'functions':[{'name':f['name'],'start':f['start'],'end':f['end']} for f in functions],'untranslated':sorted(english.unhandled),'statementCount':english.count}


def structure_contract(path, data):
    suffix = Path(path).suffix.lower()
    text = data.decode('utf-8-sig', errors='replace')
    lines = ['Preserve the original file bytes at ' + path + '. Interpret its structure without changing the source asset.']
    if suffix == '.xlsx':
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            workbook = ET.fromstring(archive.read('xl/workbook.xml'))
            ns = {'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            sheets = [dict(e.attrib) for e in workbook.findall('s:sheets/s:sheet', ns)]
            lines += ['Format: Excel workbook.', 'Sheets in order: ' + json.dumps(sheets, ensure_ascii=False) + '.']
            for name in archive.namelist():
                if name.startswith('xl/worksheets/') and name.endswith('.xml'):
                    sheet = ET.fromstring(archive.read(name))
                    cells = sheet.findall('.//s:c', ns)
                    lines += [name + ': ' + str(len(cells)) + ' stored cells; ' + str(sum(c.find('s:f',ns) is not None for c in cells)) + ' formulas. First-row cell positions and types: ' + json.dumps([dict(c.attrib) for c in cells if c.attrib.get('r','').rstrip('0123456789') + '1' == c.attrib.get('r')], ensure_ascii=False) + '.']
            lines.append('Retain cell types, sheet order, relationships, formulas, named ranges, formatting and original workbook bytes. This inventory is not a recalculation or a business interpretation. Review field meanings before approving use.')
    elif suffix in ('.xml', '.xsd'):
        root = ET.fromstring(text)
        local = lambda tag: tag.rsplit('}', 1)[-1]
        lines += ['Format: ' + ('XML Schema' if suffix == '.xsd' else 'XML template') + '.', 'Root element: ' + root.tag + '.', 'Root attributes: ' + json.dumps(root.attrib, ensure_ascii=False) + '.', 'Total element count: ' + str(sum(1 for _ in root.iter())) + '.']
        children = [{'name':local(child.tag),'attributes':dict(child.attrib)} for child in root]
        lines += ['Direct child definitions, in order:', '\n'.join('- ' + json.dumps(child, ensure_ascii=False) for child in children) or '- None.']
        if suffix == '.xsd': lines.append('Use the retained schema as the authoritative source for types, enumerations, patterns, ranges, required attributes, occurrence counts, imports, and includes. Resolve relative schema locations against this file’s directory. Do not infer constraints from this overview alone.')
        else: lines.append('When populating this template, preserve namespaces, required identifiers, child order, relationships, and content types. Substitute only the fields required by the operation. Validate populated output against the retained schema and package relationships.')
    elif suffix == '.json':
        value = json.loads(text)
        def shape(item, depth=0):
            if depth > 6: return 'nested value: inspect original'
            if isinstance(item, dict): return {key:shape(val,depth+1) for key,val in item.items()}
            if isinstance(item, list): return {'type':'array','items':len(item),'observed_item_shapes':[shape(val,depth+1) for val in item[:3]]}
            return type(item).__name__
        lines += ['Format: JSON.', 'Observed field structure (sampled values are not a validation schema): ' + json.dumps(shape(value), ensure_ascii=False) + '.', 'Preserve field names, nesting, arrays, number representations, nulls and original bytes. Confirm required fields, types, units and permitted values with the business owner; observed values alone do not define those constraints.']
    elif suffix in ('.csv', '.tsv'):
        rows = list(csv.reader(io.StringIO(text), delimiter='\t' if suffix == '.tsv' else ','))
        lines += ['Format: delimited table.', 'Column order: ' + json.dumps(rows[0] if rows else [], ensure_ascii=False) + '.', 'Data rows: ' + str(max(0, len(rows)-1)) + '.', 'Preserve column order, quoting, empty values, and the original file. Define column types from reviewed business requirements rather than guessing from a few rows.']
    else:
        lines.append('Review the asset’s format, fields, units, ordering, required values, and constraints before using it. The original file remains authoritative.')
    return {'kind':'retain','structure':'\n\n'.join(lines),'untranslated':[]}


class HTMLInventory(HTMLParser):
    def __init__(self):
        super().__init__()
        self.elements = []
        self.hidden = []
    def handle_starttag(self, tag, attrs):
        self.elements.append({'element':tag, 'attributes':{key:('Requires English behavior specification' if key.startswith('on') or key=='style' else value) for key,value in attrs}})
        if tag in ('script','style'): self.hidden.append(tag)
    def handle_endtag(self, tag):
        if self.hidden and self.hidden[-1]==tag: self.hidden.pop()
    def handle_data(self, data):
        if not self.hidden and data.strip(): self.elements.append({'visible_text':data.strip()})


def analyze_entry(path, data):
    suffix = Path(path).suffix.lower()
    if suffix == '.py': entry = python_contract(path, data.decode('utf-8-sig'))
    elif suffix in ('.html', '.htm'):
        inventory = HTMLInventory()
        inventory.feed(data.decode('utf-8-sig'))
        entry = {'kind':'generate','purpose':'Recreate the specified screen from reviewable English instructions.','inputs':'Define data fields, defaults, required values and user events.','outputs':'Generate ' + path + ' at runtime, following the reviewed screen contract.','behavior':'Source element inventory in order:\n' + '\n'.join('- ' + json.dumps(e, ensure_ascii=False) for e in inventory.elements),'errors':'Define empty, invalid, failed and loading states before use.','checks':'Compare field order, layout, responsive behavior and interactions with the original screen.','untranslated':['CSS and interaction behavior require English specification'],'functionCount':0}
    elif Path(path).name.lower().startswith('license'): entry = {'kind':'document','structure':data.decode('utf-8-sig'),'untranslated':[]}
    else: entry = structure_contract(path, data)
    return {'sourcePath':path,'sha256':hashlib.sha256(data).hexdigest(),**entry}


def attach_dependencies(entries, sources):
    paths = set(sources)
    for entry in entries:
        path = entry['sourcePath']
        dependencies = set()
        if path.endswith('.py') and not entry.get('error'):
            tree = ast.parse(sources[path].decode('utf-8-sig'))
            for node in ast.walk(tree):
                modules = [(node.module or '', node.level)] if isinstance(node, ast.ImportFrom) else [(alias.name, 0) for alias in node.names] if isinstance(node, ast.Import) else []
                for module, level in modules:
                    base = PurePosixPath(path).parent
                    if level:
                        for _ in range(level-1): base = base.parent
                        candidates = [base / module.replace('.', '/')]
                    else:
                        candidates = [parent / module.replace('.', '/') for parent in [base, *base.parents]]
                    for candidate in candidates:
                        alternatives = [str(candidate) + '.py', str(candidate / '__init__.py')]
                        found = next((p for p in alternatives if p in paths and p != path), None)
                        if found: dependencies.add(found); break
        elif path.endswith('.xsd') and not entry.get('error'):
            tree = ET.fromstring(sources[path])
            for node in tree.iter():
                location = node.attrib.get('schemaLocation')
                if location and '://' not in location:
                    import posixpath
                    target = posixpath.normpath(str(PurePosixPath(path).parent / location))
                    if target in paths: dependencies.add(target)
        entry['dependencies'] = sorted(dependencies)
    return entries


def analyze(root):
    results = []
    for file in sorted(root.rglob('*')):
        if not file.is_file(): continue
        path = file.relative_to(root).as_posix()
        if file.suffix.lower() == '.md': continue
        data = file.read_bytes()
        results.append(analyze_entry(path, data))
    return attach_dependencies(results, {file.relative_to(root).as_posix():file.read_bytes() for file in root.rglob('*') if file.is_file()})


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--stdin':
        requests = json.load(sys.stdin)
        output = []
        for item in requests:
            try: output.append(analyze_entry(item['path'], base64.b64decode(item['data'], validate=True)))
            except Exception as error: output.append({'sourcePath':item['path'],'error':str(error)})
        attach_dependencies(output, {item['path']:base64.b64decode(item['data']) for item in requests})
        print(json.dumps(output, ensure_ascii=False))
        sys.exit(0)
    source_root = Path(sys.argv[1]).resolve()
    destination = Path(sys.argv[2]).resolve()
    analysis = analyze(source_root)
    destination.write_text(json.dumps(analysis, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps({'resources':len(analysis),'codeContracts':sum(e['kind']=='generate' for e in analysis),'retainedAssets':sum(e['kind']=='retain' for e in analysis),'documentation':sum(e['kind']=='document' for e in analysis),'functions':sum(e.get('functionCount',0) for e in analysis),'untranslated':{e['sourcePath']:e['untranslated'] for e in analysis if e['untranslated']}}))
