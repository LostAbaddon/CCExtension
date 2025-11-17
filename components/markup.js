/* MarkUp: A new type Markdown Parser.
 * Author: LostAbaddon
 * Email: LostAbaddon@gmail.com
 * Version: 1.1.3
 * Date: 2025.03.23
 *
 * 1. Remove `calculateTable` and `parseEquation` for extention.
 * 2. Add Focus Mark.
 */

(() => {
	const SymHidden = Symbol('HIDDEN');
	const MetaWords = ['GOD', 'THEONE', 'TITLE', 'AUTHOR', 'EMAIL', 'DESCRIPTION', 'STYLE', 'SCRIPT', 'DATE', 'UPDATE', 'PUBLISH', 'KEYWORD', 'GLOSSARY', 'TOC', 'REF', 'LINK', 'IMAGES', 'VIDEOS', 'AUDIOS', 'ARCHOR', 'SHOWTITLE', 'SHOWAUTHOR', 'RESOURCES'];
	const MetaAlias = {
		'标题': 'title',
		'作者': 'author',
		'简介': 'description',
		'关键词': 'keywords',
		'发布': 'publish',
		'更新': 'update',
	};
	const PreservedKeywords = ['toc', 'glossary', 'resources', 'images', 'videos', 'audios'];
	const ParagraphTags = ['article', 'section', 'div', 'p', 'header', 'footer', 'aside', 'ul', 'ol', 'li', 'blockquote', 'pre', 'figure', 'figcaption'];
	const TimeStampKeywords = ['date', 'update', 'publish'];
	const Char2Dig = {
		a: '0',
		b: '1',
		c: '2',
		d: '3',
		e: '4',
		f: '5',
		g: '6',
		h: '7',
		i: '8',
		j: '9',
		k: 'a',
		l: 'b',
		m: 'c',
		n: 'd',
		o: 'e',
		p: 'f',
		q: 'g',
		r: 'h',
		s: 'i',
		t: 'j',
		u: 'k',
		v: 'l',
		w: 'm',
		x: 'n',
		y: 'o',
		z: 'p',
	};
	const PreserveWords = {
		'\\': 'slash',
		'/': 'antislash',
		'_': 'underline',
		'*': 'star',
		'+': 'plus',
		'-': 'minus',
		'=': 'equal',
		'`': 'dash',
		'~': 'wavy',
		'!': 'bang',
		'?': 'question',
		':': 'colon',
		'@': 'at-circle',
		'#': 'sharp',
		'^': 'angle',
		'$': 'dollar',
		'%': 'percent',
		'(': 'left-bracket',
		')': 'right-bracket',
		'[': 'left-square-bracket',
		']': 'right-square-bracket',
		'{': 'left-curve-bracket',
		'}': 'right-curve-bracket',
		'|': 'vertical-line',
	};
	const ReversePreserveWords = {};
	Object.keys(PreserveWords).forEach(key => ReversePreserveWords[PreserveWords[key].toLowerCase()] = key);
	ReversePreserveWords['$'] = '&#36;';
	MetaWords.forEach((w, i) => MetaWords[i] = w.toLowerCase());

	const MarkUp = {};
	const LineRender = {}; // Level 小于 0 的不做保留字替换，从 0 开始作保留字替换
	const BlockRender = {}; // 主体处理结束后的后续处理插件
	const FinalRender = {}; // 主体处理结束后的后续处理插件

	const generateRandomKey = (len=8) => {
		var result = '';
		for (let i = 0; i < len; i ++) {
			result += Math.floor(Math.random() * 10) + '';
		}
		return result;
	};

	MarkUp.addExtension = (ext, isInline=0, level=5) => {
		// 如果是块内解析插件
		if (isInline === 0) {
			let indexes = LineRender['_indexes_'];
			if (!indexes) {
				indexes = [];
				LineRender['_indexes_'] = indexes;
			}
			if (!indexes.includes(level)) {
				indexes.push(level);
				indexes.sort((a, b) => a - b);
			}
			indexes = LineRender[level];
			if (!indexes) {
				indexes = [];
				LineRender[level] = indexes;
			}
			indexes.push(ext);
		}
		// 如果是块级解析插件
		else if (isInline === 1) {
			let indexes = BlockRender['_indexes_'];
			if (!indexes) {
				indexes = [];
				BlockRender['_indexes_'] = indexes;
			}
			if (!indexes.includes(level)) {
				indexes.push(level);
				indexes.sort((a, b) => a - b);
			}
			indexes = BlockRender[level];
			if (!indexes) {
				indexes = [];
				BlockRender[level] = indexes;
			}
			indexes.push(ext);
		}
		// 如果是最终解析插件
		else if (isInline === 2) {
			let indexes = FinalRender['_indexes_'];
			if (!indexes) {
				indexes = [];
				FinalRender['_indexes_'] = indexes;
			}
			if (!indexes.includes(level)) {
				indexes.push(level);
				indexes.sort((a, b) => a - b);
			}
			indexes = FinalRender[level];
			if (!indexes) {
				indexes = [];
				FinalRender[level] = indexes;
			}
			indexes.push(ext);
		}
	};

	// 准备文档，进行必要的预处理
	const prepare = text => {
		text = '\n' + text + '\n';
		text = text.replace(/\r+\n\r*|\r*\n\r+/g, '\n').replace(/\r+/g, '\n');
		text = text.replace(/\n[　\s]+/g, (match) => {
			match = match.replace(/　/g, '  ').replace(/\t/g, '    ');
			if (match === '\n ') return "\n  ";
			return match;
		});
		MetaWords.forEach(key => {
			var reg = new RegExp('([\\w\\W]? *)\\[' + key + '\\]( *[\\w\\W]?)', 'gi');
			text = text.replace(reg, (match, pre, post) => {
				if (pre === ']' || post === '[' || post === '(') return match;
				return pre + '%' + key + '%' + post;
			});
		});
		return text;
	};

	// 规整文档
	const regularize = text => {
		text = text.replace(/^\n+|\n+$/gi, '');
		text = text.replace(/\n{3,}/gi, '\n\n\n');
		return text;
	};

	// 解析段内样式
	const parseLine = (line, doc, currLevel=-Infinity, caches) => {
		var indexes = LineRender['_indexes_'];
		if (!indexes) return '';

		var outmost = !caches;
		caches = caches || {}
		indexes.some(level => {
			if (currLevel > level) return true;
			if (level >= 0) return true;
			var exts = LineRender[level], changed = true;
			while (changed) {
				changed = false;
				exts.forEach(ext => {
					var c;
					[line, c] = ext.parse(line, doc, caches);
					if (c) changed = true;
				});
			}
		});

		line = convertPreserves(line);

		indexes.forEach(level => {
			if (currLevel > level) return;
			if (level < 0) return;
			var exts = LineRender[level], changed = true;
			while (changed) {
				changed = false;
				exts.forEach(ext => {
					var c;
					[line, c] = ext.parse(line, doc, caches);
					if (c) changed = true;
				});
			}
		});

		if (outmost) line = restorePreserves(line, caches);
		return line;
	};
	// 分析每一行可能是什么段级样式
	const analyzeLineStyle = line => {
		var head;

		// 空行
		if (!line.trim()) return { empty: true };
		// 分割线
		if (!!line.match(/^\s*(\-{3,}|={3,}|~{4,}|\+{3,}|\*{3,}|\.{3,}|_{3,}|#{3,})\s*$/)) {
			return {sepLine: 2};
		}
		// 代码块
		head = line.match(/^(`{3}|~{3})\s*([\w\-\.\+=\?\~\\\/]*)$/);
		if (!!head) {
			if (!!head[2]) {
				return { codeBlock: 2, other: head[1] };
			}
			else {
				return { codeBlock: 1, other: head[1] };
			}
		}
		// 公式块
		head = line.match(/^\${2}\s*$/);
		if (!!head) {
			return { latexBlock: 1 };
		}
		// 列表
		head = line.match(/^([\-\+\*~]|\d+\.)[　\s]+/);
		if (!!head) {
			return {list: 1};
		}
		// 引用或列表
		head = line.match(/^>[　\s]+/);
		if (!!head) {
			return {quote: 1};
		}
		// 引用与列表都有可能
		head = line.match(/^ {2,}/);
		if (!!head) {
			return { list: 1, quote: 1 };
		}
		// 表格
		head = line.match(/\|/g);
		if (!!head) {
			let ctx = line.match(/(\\\\)*\\\|/g);
			if (!ctx || (!!ctx && ctx.length !== head.length)) {
				let has = true;
				ctx = line;
				while (has) {
					has = false;
					let x = ctx.replace(/\([^\(\)\[\]\{\}]+?\)/g, '');
					x = x.replace(/\[[^\(\)\[\]\{\}]+?\]/g, '');
					x = x.replace(/\{[^\(\)\[\]\{\}]+?\}/g, '');
					has = (x !== ctx);
					ctx = x;
				}
				if (ctx.indexOf('|') >= 0) {
					return { table: 1 };
				}
			}
		}

		return null;
	};
	// 解析段级样式
	const parseSection = (content, doc, currLevel=0, caches) => {
		doc.parseLevel ++;

		var sections = [];

		var outmost = false;
		if (!caches) {
			outmost = true;
			caches = {};
		}

		// 先预判断每一段可能是什么
		var blocks = []; // 行号，是否空行，疑似分割线，疑似引用，疑似列表，是否代码块首尾，疑似表格，是否公式首尾，其它信息
		sections = content.split('\n');
		sections.forEach((line, index) => {
			var style = analyzeLineStyle(line);
			if (!style) return;
			var result = [index, style.empty || 0, style.sepLine || 0, style.quote || 0, style.list || 0, style.codeBlock || 0, style.table || 0, style.latexBlock || 0, style.other];
			blocks.push(result);
		});
		var blockMap = {};
		blocks.forEach(line => {
			blockMap[line[0]] = line;
		});

		var changed = false;
		if (blocks.length > 0) {
			// LaTeX 数学公式
			changed = parseLaTeX(blocks, blockMap, sections, doc, caches) || changed;

			// 处理独立代码块，引用、列表与表格中的代码块后处理
			if (blocks.length > 0) changed = parseCodeBlock(blocks, blockMap, sections, doc, caches) || changed;

			// 表格
			if (blocks.length > 0) changed = parseTable(blocks, blockMap, sections, doc, caches) || changed;

			// 插入行号
			if (outmost && currLevel === 0 && !!doc.metas.linenumber) {
				let lineID = 0;
				sections.forEach((line, id) => {
					if (!line) return;
					if (!!line.match(/^%[\w\-]+%$/)) return;
					var info = blockMap[id];
					if (!!info && (info[1] > 0 || info[2] > 0)) return; // 去除空行和分割线
					if (!!line.match(/^[　\s>\+\-\*`\^\|_~=\{\}<]$/)) return; //去除引用列表等中的空行
					if (!!line.match(/^[!@#]\[[^\(\)\[\]\{\}]*?(\[.*?\][　\s]*\(.*?\))*?[^\(\)\[\]\{\}]*?\](\([^\(\)\[\]\{\}]*?\))$/)) return; // 去除图片等资源
					if (!!line.match(/^[!@#]\[[^\(\)\[\]\{\}]*?(\[.*?\][　\s]*\(.*?\))*?[^\(\)\[\]\{\}]*?\](\[[^\(\)\[\]\{\}]*?\])$/)) return; // 去除图片等资源
					var tail = line.match(/\{[<\|>]\}$/);
					if (!!tail) {
						tail = tail[0];
						line = line.substr(0, line.length - tail.length) + '<span name="line-' + lineID + '"></span>' + tail;
					}
					else {
						line = line + '<span name="line-' + lineID + '"></span>';
					}
					lineID++;
					sections[id] = line;
				});
				doc.metas.totalLineCount = lineID;
			}

			// 重排内容
			[sections, blockMap] = squeezeContents(blocks, blockMap, sections);

			// 引用与列表
			if (blocks.length > 0) {
				changed = parseListAndBlockQuote(blocks, blockMap, sections, doc, caches) || changed;
				[sections, blockMap] = squeezeContents(blocks, blockMap, sections);
			}

			// 解析标题
			if (blocks.length > 0) {
				changed = parseHeadline(blocks, blockMap, sections, doc, caches) || changed;
				[sections, blockMap] = squeezeContents(blocks, blockMap, sections);
			}
		}

		// 将图移出
		changed = parseResources(blocks, blockMap, sections, doc, caches) || changed;
		[sections, blockMap] = squeezeContents(blocks, blockMap, sections);

		// 段落处理
		changed = parseParagraph(blocks, blockMap, sections, doc, caches) || changed;

		sections = sections.map(line => {
			if (line === null) return '';
			if (line === undefined) return '';
			if (line.length === 0) return '';
			var context = '';
			if (outmost) {
				let head = line.match(/^%([\w\W]+)%(\{[\w \-\.\u0800-\uffff]+\})*$/);
				if (!!head) {
					context = restorePreserves(line, caches, false);
				} else {
					context = parsePlainParaStyle(line, doc);
					context = restorePreserves(context, caches, false);
				}
			}
			else {
				context = parsePlainParaStyle(line, doc);
				let key = 'param-' + generateRandomKey();
				caches[key] = context;
				context = '%' + key + '%';
			}

			return context;
		});

		doc.parseLevel --;
		if (doc.parseLevel > 0) sections = sections.join('');

		return sections;
	};

	const squeezeContents = (blocks, blockMap, contents) => {
		contents = contents.map((line, i) => [i, line]);
		contents = contents.filter(line => {
			if (!line[1] && line[1] !== '') return false;
			return true;
		});
		contents.forEach((line, i) => {
			var j = line[0];
			var b = blockMap[j];
			if (!b) return;
			b[0] = i;
		});
		blockMap = {};
		blocks.forEach(line => {
			blockMap[line[0]] = line;
		});
		contents = contents.map(line => line[1]);
		return [contents, blockMap];
	};
	const parsePlainParaStyle = (line, doc) => {
		var prefix = '<p', postfix = '</p>', classes = [];

		// 前置对齐
		var lineContent = line.replace(/^[　\s]*(<\w+.*?>)?[　\s]*/, '');
		var align = lineContent.match(/^\{[<\|>]\}/);
		if (!!align) {
			align = align[0];
			if (align === '{<}') {
				classes.push('align-left');
			}
			else if (align === '{|}') {
				classes.push('align-center');
			}
			else if (align === '{>}') {
				classes.push('align-right');
			}
			line = line.replace(/^[　\s]*(<\w+.*?>)?[　\s]*\{[<\|>]\}[　\s]*/, (match, head) => head || '');
		}
		// 后置对齐
		lineContent = line.replace(/[　\s]*(<\/\w+.*?>)?[　\s]*$/, '');
		align = lineContent.match(/\{[<\|>]\}$/);
		if (!!align) {
			align = align[0];
			if (align === '{<}') {
				classes.push('align-left');
			}
			else if (align === '{|}') {
				classes.push('align-center');
			}
			else if (align === '{>}') {
				classes.push('align-right');
			}
			line = line.replace(/[　\s]*\{[<\|>]\}[　\s]*(<\/\w+.*?>)?[　\s]*$/, (match, tail) => tail || '');
		}

		// 缩进
		lineContent = line.replace(/^[　\s]*(<\w+.*?>)?[　\s]*/, '');
		var indent = lineContent.match(/^:+/);
		if (!!indent && !lineContent.match(/^:([\w\-\.]+?):/)) {
			indent = indent[0];
			classes.push('indent', 'indent-' + indent.length);
			line = line.replace(/^[　\s]*(<\w+.*?>)?[　\s]*:+/, (match, head) => head || '');
		}

		// 添加FocusMark
		if (!!MarkUp.FocusPlaceholder && line.indexOf(MarkUp.FocusPlaceholder) >= 0) {
			line = line.replace(MarkUp.FocusPlaceholder, '<span class="' + MarkUp.FocusClassName + '"></span>');
		}

		// 合成样式
		if (classes.length > 0) {
			prefix = prefix + ' class="' + classes.join(' ') + '"';
		}
		prefix = prefix + '>';

		// 解析段落
		// line = parseLine(line, doc);
		if (line.length === 0) return '';
		return prefix + line + postfix;
	};
	const parseLaTeX = (blocks, blockMap, contents, doc, caches) => {
		// 筛选出疑似独立代码块
		var equaBlocks = [];
		blocks.forEach(line => {
			if (!line[7]) return;
			equaBlocks.push(line);
		});

		if (equaBlocks.length === 0) return false;
		if (equaBlocks.length === 1) {
			equaBlocks[0][7] = 0;
			return false;
		}

		// 先分离明确知道开头的
		var total = equaBlocks.length, prev = equaBlocks[0];
		prev[7] = 2;
		for (let i = 1; i < total; i ++) {
			let curr = equaBlocks[i];
			if (prev[7] === 2) {
				curr[3] = prev[3];
				curr[4] = prev[4];
				curr[7] = 3;
			}
			else if (prev[7] === 3) curr[7] = 2;
			prev = curr;
		}
		if (equaBlocks[equaBlocks.length - 1][7] === 2) equaBlocks[equaBlocks.length - 1][7] = 0;

		// 去除无用行
		equaBlocks.forEach(line => {
			if (line[7] === 1) line[7] = 0;
		});
		var starters = [];
		equaBlocks = equaBlocks.filter(line => {
			if (line[7] < 2) return false;
			if (line[7] === 2) starters.push(line[0])
			return true;
		});

		total = equaBlocks.length;
		for (let i = total - 1; i > 0; i -= 2) {
			let j = equaBlocks[i - 1][0];
			if (!starters.includes(j)) {
				equaBlocks.splice(i - 1, 2);
			}
		}

		// 生成代码
		var equaSection = [];
		total = equaBlocks.length;
		for (let i = 0; i < total; i += 2) {
			equaSection.push([equaBlocks[i][0], equaBlocks[i + 1][0]]);
		}
		equaSection.forEach(block => {
			var ctx = ['<p class="latex block">$$'];
			for (let i = block[0] + 1; i < block[1]; i ++) {
				ctx.push(contents[i]);
			}
			ctx.push('$$</p>');
			ctx = ctx.join('<br>');

			var key = 'latex-' + generateRandomKey();
			doc.finals[key] = ctx;
			contents[block[0]] = '%' + key + '%';
			for (let i = block[0] + 1; i <= block[1]; i ++) {
				contents[i] = null;
			}
			for (let i = block[0]; i <= block[1]; i ++) {
				let line = blockMap[i];
				if (!line) continue;
				let j = blocks.indexOf(line);
				if (j >= 0) blocks.splice(j, 1);
				delete blockMap[i];
				line[0] = -1;
			}
		});

		return equaSection.length > 0;
	};
	const parseCodeBlock = (blocks, blockMap, contents, doc, caches) => {
		// 筛选出疑似独立代码块，第五位：1: 未知开始结束; 2: 开始; 3: 结束; 0: 不是有效代码开始结束符
		var codeBlocks = [];
		blocks.forEach(line => {
			if (!line[5]) return;
			codeBlocks.push(line);
		});

		if (codeBlocks.length === 0) return false;
		if (codeBlocks.length === 1) {
			codeBlocks[0][5] = 0;
			return false;
		}

		// 剔除内嵌
		var total = codeBlocks.length, prev = codeBlocks[0], shouldRemove = [], char;
		prev[5] = 2;
		char = prev[8];
		// 先分离明确知道开头的，并剔除内嵌
		for (let i = 1; i < total; i ++) {
			let curr = codeBlocks[i];
			if (!!char && curr[8] !== char) {
				curr[5] = 0;
				continue;
			}
			if (curr[5] === 2) {
				if (i === total - 1) curr[5] = 0;
				if (prev[5] !== 3) {
					prev[5] = 0;
					continue;
				}
				char = curr[8];
			}
			if (prev[5] === 2) {
				curr[3] = prev[3];
				curr[4] = prev[4];
				curr[5] = 3;
				char = null;
			}
			else if (prev[5] === 3) curr[5] = 2;
			prev = curr;
		}
		if (codeBlocks[codeBlocks.length - 1][5] === 2) codeBlocks[codeBlocks.length - 1][5] = 0;

		// 去除无用行
		codeBlocks.forEach(line => {
			if (line[5] === 1) line[5] = 0;
		});
		var starters = [];
		codeBlocks = codeBlocks.filter(line => {
			if (line[5] < 2) return false;
			if (line[5] === 2) starters.push(line[0])
			return true;
		});

		total = codeBlocks.length;
		for (let i = total - 1; i > 0; i -= 2) {
			let j = codeBlocks[i - 1][0];
			if (!starters.includes(j)) {
				codeBlocks.splice(i - 1, 2);
			}
		}

		// 生成代码
		var codeSection = [];
		total = codeBlocks.length;
		for (let i = 0; i < total; i += 2) {
			let cb1 = codeBlocks[i], cb2 = codeBlocks[i + 1];
			if (!cb1 || !cb2) break;
			cb1 = cb1[0];
			cb2 = cb2[0];
			codeSection.push([cb1, cb2]);
		}
		codeSection.forEach(block => {
			var lineS = contents[block[0]];
			var lang = lineS.match(/(`{3,}|~{3,})[　\s]*/)[0];
			var index = lineS.indexOf(lang);
			lang = lineS.substr(index + lang.length, lineS.length);
			lang = lang.replace(/^[　\s]+|[　\s]+$/g, '');
			lang = lang.toLowerCase();
			if (!lang || lang === '' || lang === 'text') lang = 'plaintext';
			var prefix = '<pre lang="language-' + lang + '"><code class="language-' + lang + '">', postfix = '</code></pre>';
			var ctx = [];
			for (let i = block[0] + 1; i < block[1]; i ++) {
				let ct = contents[i];
				ctx.push(ct);
			}
			ctx = ctx.join('\n');
			ctx = prefix + ctx + postfix;

			var key = 'codeblock-' + generateRandomKey();
			doc.finals[key] = ctx;
			contents[block[0]] = '%' + key + '%';
			for (let i = block[0] + 1; i <= block[1]; i ++) {
				contents[i] = null;
			}
			for (let i = block[0]; i <= block[1]; i ++) {
				let line = blockMap[i];
				if (!line) continue;
				let j = blocks.indexOf(line);
				if (j >= 0) blocks.splice(j, 1);
				delete blockMap[i];
				line[0] = -1;
			}
		});

		return codeSection.length > 0;
	};
	const parseTable = (blocks, blockMap, contents, doc, caches) => {
		// 筛选出疑似独立代码块
		var tableBlocks = [];
		blocks.forEach(line => {
			if (!line[6]) return;
			tableBlocks.push(line);
		});

		if (tableBlocks.length === 0) return;

		// 筛选可能的表格区，包括在引用或列表内的也不考虑
		var tables = [], index = 0, last = tableBlocks[0][0];
		tables.push([tableBlocks[0]]);
		var total = tableBlocks.length;
		for (let i = 1; i < total; i ++) {
			let l = tableBlocks[i];
			if (l[0] === last + 1) {
				tables[index].push(l);
			} else {
				index ++;
				tables[index] = [l];
			}
			last = l[0];
		}
		tables = tables.filter(list => {
			if (list.length < 2) return false;
			return true;
		});

		// 生成表格
		tables.forEach(table => {
			generateTable(table, blocks, blockMap, contents, doc, caches);
		});

		return true;
	};
	const parseListAndBlockQuote = (blocks, blockMap, contents, doc, caches) => {
		var end = 0, start = contents.length;
		blocks.forEach((line, i) => {
			if (line[3] + line[4] === 0) return;
			var id = line[0];
			if (id < start) start = id;
			if (id > end) end = id;
		});
		if (start > end) return false;

		// 最后一个表格或引用之后的普通行可能会被忽略，这里要补上
		for (let i = end + 1; i < contents.length - 1; i ++) {
			let a = blockMap[i], b = blockMap[i + 1];
			if (!!a && a[1] > 0 && !!b && b[1] > 0) break;
			end = i;
		}
		if (end === contents.length - 2) {
			let i = contents.length - 1;
			let a = blockMap[i];
			if (!a || a[1] === 0) end = i
		}

		// 将内容分配到分离开的区块中
		var blkID = 0, blockList = [[[start, blockMap[start]]]], isQuote = false, inside = true;
		if (blockMap[start][3] > 0) isQuote = true;
		for (let i = start + 1; i <= end; i ++) {
			var info = blockMap[i];

			// 普通内容行，或者代码块、公式块的内行
			// 则如果原本就在引用或列表内，则继续留在里面
			if (!info) {
				if (inside) blockList[blkID].push([i, null]);
				continue;
			}

			// 判断空行的中断规则
			if (info[1]) {
				if (!inside) continue;
				// 需连续两个空行才中断引用
				let jnfo = blockMap[i + 1];
				if (!jnfo || jnfo[1] > 0) {
					inside = false;
					continue;
				}
				blockList[blkID].push([i, info]);
				continue;
			}

			if (info[3] + info[4] === 0) {
				if (inside) blockList[blkID].push([i, info]);
				continue;
			}

			// 如果还在引用或列表内，则继续留在里面
			if (inside) {
				blockList[blkID].push([i, info]);
				continue;
			}

			// 如果已经不在引用或列表中，则开启新列表
			blkID ++;
			blockList[blkID] = [];
			if (blockMap[i][3] > 0) isQuote = true;
			else isQuote = false;
			inside = true;
			blockList[blkID].push([i, info]);
		}

		// 生成引用块或列表
		var changed = false;
		blockList.forEach(qaBlock => {
			var type = 0;
			var id = qaBlock[0][0];
			var ctx = contents[id];
			var type = -1;
			if (!!ctx.match(/^[　\s>]/)) type = 0; // 引用
			else if (!!ctx.match(/^[\-\+\*~][　\s]/)) type = 1; // 无序列表
			else if (!!ctx.match(/^\d+\.[　\s]/)) type = 2;
			if (type < 0) return;
			changed = true;
			if (type === 0) generateQuotes(qaBlock, blocks, blockMap, contents, doc, caches);
			else if (type === 1) generateList(false, qaBlock, blocks, blockMap, contents, doc, caches);
			else if (type === 2) generateList(true, qaBlock, blocks, blockMap, contents, doc, caches);
		});
		return changed;
	};
	const parseHeadline = (blocks, blockMap, contents, doc, caches) => {
		var headlines = [], headers = [];
		blocks.forEach(line => {
			if (line[2] === 0) return;
			var id = line[0];
			var info = blockMap[id - 1];
			if (!info) {
				let ctx = contents[id - 1];
				if (id === 0 || !!ctx.match(/^%[\w\-]+%$/)) {
					headlines.push([id, contents[id].replace(/^[　\s]+|[　\s]+$/, '')[0]]);
				}
				else {
					let c = contents[id].substr(0, 1);
					if (c === '=') headers.push([id - 1, 1]);
					else if (c === '-') headers.push([id - 1, 2]);
					else if (c === '~') headers.push([id - 1, 3]);
					else if (c === '+') headers.push([id - 1, 3]);
					else if (c === '_') headers.push([id - 1, 3]);
					else if (c === '*') headers.push([id - 1, 4]);
					else if (c === '#') headers.push([id - 1, 5]);
					else if (c === '.') headers.push([id - 1, 6]);
					contents[id] = null;
				}
			}
			else {
				if (info[1] > 0) headlines.push([id, contents[id].replace(/^[　\s]+|[　\s]+$/, '')[0]]);
			}
		});
		for (let i = 0; i < contents.length; i ++) {
			let ctx = contents[i];
			if (!ctx) continue;
			let header = ctx.match(/^(#+)[　\s]*/);
			if (!!header) {
				let l = header[0], cp = header[1];
				if (l !== ctx) {
					if (ctx.indexOf(l + '[') !== 0) {
						headers.push([i, cp.length]);
						contents[i] = ctx.replace(/^#+[　\s]*|[　\s]*#+$/g, '');
					}
				}
			}
		}
		if (headlines.length + headers.length === 0) return false;

		headers.sort((la, lb) => la[0] - lb[0]);

		headlines.forEach(item => {
			var [id, type] = item;
			var key = 'headline-' + generateRandomKey();
			var html = '<hr';
			if (type === '=') html = html + ' class="heavy">';
			else if (type === '-') html = html + ' class="light">';
			else if (type === '*') html = html + ' class="star">';
			else if (type === '~') html = html + ' class="wavy">';
			else if (type === '.') html = html + ' class="dotted">';
			else if (type === '_') html = html + ' class="dashed">';
			else if (type === '+') html = html + ' class="strong">';
			else if (type === '#') html = html + ' class="heavystrong">';
			else html = html + '>';
			caches[key] = html;
			contents[id] = "%" + key + "%";
		});
		headers.forEach(item => {
			var [id, level] = item;
			var key = 'header-' + generateRandomKey();
			var tag = 'h' + (level || 1);
			var html = contents[id];
			html = parseLine(html, doc);
			html = html.replace(/^[　\s\n]+|[　\s\n]+$/, '');
			html = '<' + tag + '>' + html + '</' + tag + '>';
			caches[key] = html;
			contents[id] = "%" + key + "%";
		});

		return true;
	};
	const parseResources = (blocks, blockMap, contents, doc, caches) => {
		var ctxes = [], changed = true;
		while (changed) {
			changed = false;
			contents.forEach(line => {
				if (line.length === 0) return ctxes.push(line);

				// 将地址引用恢复（使用metas和refs）
				line = line.replace(/(\])[　\s]*(\[([\w \-\.]+)\])/g, (match, prefix, all, name) => {
					var ref = doc.refs[name], meta;
					if (!ref || (ref.indexOf('://') < 0 && ref.indexOf('@') < 0 && !ref.match(/^\.{0,2}[\\\/]/)) || ref.indexOf('\n') >= 0) {
						meta = doc.metas[name.toLowerCase()];
						if (!meta || (meta.indexOf('://') < 0 && meta.indexOf('@') < 0 && !meta.match(/^\.{0,2}[\\\/]/)) || meta.indexOf('\n') >= 0) return match;
						ref = meta;
					}
					return prefix + '(' + ref + ')';
				});

				// 将图片等资源移到下一行
				var resources = [], befores = [], inner_changed = true;
				while (inner_changed) {
					inner_changed = false;
					line = line.replace(/[!@#]\[[^\(\)\[\]\{\}]*?(\[.*?\][　\s]*\(.*?\))*?[^\(\)\[\]\{\}]*?\](\([^\(\)\[\]\{\}]*?\))/g, (match, useless, link) => {
						inner_changed = true;
						if (!!link.match(/[　\s]+"(left|right)"\)$/)) {
							befores.push(match);
						}
						else {
							resources.push(match);
						}
						return '';
					});
				}
				line = line.replace(/^[　\s]+|[　\s]+$/g, '');
				befores.forEach(line => ctxes.push(line));
				if (line.length > 0) {
					if (resources.length > 0) changed = true;
					ctxes.push(line);
				}
				resources.forEach(line => ctxes.push(line));
			});

			contents.splice(0, contents.length);
			ctxes.forEach(line => contents.push(line));
			ctxes = [];
		}
		return true;
	};
	const parseParagraph = (blocks, blockMap, contents, doc, caches) => {
		// 分离出连续段落、资源、图片墙
		var paragraphs = [], imagewalls = [], resources = [], last = -1;
		contents.forEach((line, id) => {
			if (!line || line.length === 0) {
				last = -1;
				return;
			}
			var head = line.match(/^%([\w\W]+)%(\{[\w \-\.\u0800-\uffff]+\})*$/);
			if (!!head) {
				last = -1;
				return;
			}
			head = line.match(/^[@#]\[[^\(\)\[\]\{\}]*?(\[.*?\][　\s]*\(.*?\))*?[^\(\)\[\]\{\}]*?\]\([^\(\)\[\]\{\}]*?\)$/);
			if (!!head) {
				resources.push([id, line]);
				last = -1;
				return;
			}
			head = line.match(/^!\[[^\(\)\[\]\{\}]*?(\[.*?\][　\s]*\(.*?\))*?[^\(\)\[\]\{\}]*?\]\([^\(\)\[\]\{\}]*?\)$/);
			var type = !!head ? 1 : 0;
			if (type === last) {
				if (type === 0) {
					paragraphs[paragraphs.length - 1].push([id, line]);
				}
				else if (type === 1) {
					imagewalls[imagewalls.length - 1].push([id, line]);
				}
			}
			else {
				if (type === 0) {
					paragraphs[paragraphs.length] = [[id, line]];
				}
				else if (type === 1) {
					imagewalls[imagewalls.length] = [[id, line]];
				}
				last = type;
			}
		});
		imagewalls = imagewalls.filter(wall => {
			var isWall = wall.length > 1;
			if (wall.length === 1) resources.push(wall[0]);
			return isWall;
		});

		// 对连续段落作处理
		paragraphs.forEach(group => {
			var content = [];
			var first = group[0][0];
			group.forEach(info => {
				var id = info[0];
				var line = info[1];
				if (line.length === 0) return;
				content.push(parseLine(line, doc));
				contents[id] = null;
			});
			content = content.join('<br>');
			contents[first] = content;
		});

		// 照片墙
		imagewalls.forEach(wall => {
			var content = [];
			var first = wall[0][0];
			wall.forEach(info => {
				content.push(parseLine(info[1], doc));
				contents[info[0]] = null;
			});
			content = content.join('');
			content = '<div class="image-wall">' + content + '</div>';
			var key = 'imagewall-' + generateRandomKey();
			caches[key] = content;
			contents[first] = '%' + key + '%';
		});

		// 独立照片资源
		resources.forEach(res => {
			var [id, content] = res;
			content = parseLine(content, doc);
			var key = 'resource-' + generateRandomKey();
			caches[key] = content;
			contents[id] = '%' + key + '%';
		});
	};

	const generateTable = (table, blocks, blockMap, contents, doc, caches) => {
		var hasHead = true, name = null;
		var cfgLine = null, cfgID = -1, tableHidden = false;

		// 提取表格名，必须唯一第一行
		name = contents[table[0][0]].match(/\|>[　\s]*(.*)[　\s]*<\|/);
		if (!!name) {
			name = name[1].trim();
			if (name.match(/\{h\}/i)) {
				tableHidden = true;
				name = name.replace(/\{h\}/gi, '').replace(/(^[　\s]+|[　\s]+$)/g, '');
			}
			contents[table[0][0]] = '';
			table.shift();
		}
		else {
			name = generateRandomKey(16);
		}

		// 分析表格的对齐信息
		table.some((info, index) => {
			var line = contents[info[0]];
			line = line.replace(/^[　\s]+|[　\s]+$/g, '');
			var ctx = line.match(/[\|:\-]+/);
			if (!ctx) return;
			ctx = ctx[0];
			if (line === ctx) {
				cfgLine = ctx;
				cfgID = info[0];
				if (index === 0) hasHead = false;
				return true;
			}
		});
		if (!cfgLine) {
			hasHead = false;
			cfgLine = [];
		}
		else {
			cfgLine = cfgLine.replace(/^\||\|$/g, '');
			cfgLine = cfgLine.split('|');
			cfgLine = cfgLine.map(cfg => {
				if (!!cfg.match(/^:\-:$/)) return 1;
				if (!!cfg.match(/^:\-$/)) return 0;
				if (!!cfg.match(/^\-:$/)) return 2;
				return 3;
			});
		}

		// 提取表格内容
		var rows = [], cols = 0;
		table.forEach((line, i) => {
			var num = line[0];
			if (num === cfgID) return;
			var row = parseTableRow(contents[num]);
			rows.push(row);
			if (row.length > cols) cols = row.length;
		});
		for (let j = cfgLine.length; j < cols; j ++) cfgLine.push('');
		for (let i = 0; i < rows.length - 1; i ++) {
			let row = rows[i];
			let rlen = !!row ? row.length : cols;
			for (let j = row.length; j < cols; j ++) row.push('');
		}
		var header;
		if (hasHead) {
			header = rows[0];
			rows.shift();
		}

		// 对自动对齐进行判断
		for (let i = 0; i < cols; i ++) {
			if (cfgLine[i] !== 3) continue;
			let isNumber = true;
			rows.some(row => {
				var item = row[i];
				if (!item) return;
				if (item * 1 !== item) {
					isNumber = false;
					return true;
				}
			});
			if (isNumber) cfgLine[i] = 2;
			else cfgLine[i] = 0;
		}

		// 生成表格正文
		var html = '<table name="' + name + '"', hiddenColumns = [];
		if (tableHidden) {
			html += ' hidden="true"';
		}
		html += '>';
		if (hasHead) {
			html += '<thead><tr>';
			header.forEach((col, i) => {
				var sortable = false;
				if (!!col.match(/\{s\}$/i)) {
					sortable = true;
					col = col.replace(/[　\s]*\{s\}$/i, '');
				}
				var hidden = false;
				if (!!col.match(/\{h\}$/i)) {
					hiddenColumns[i] = true;
					hidden = true;
					col = col.replace(/[　\s]*\{h\}$/i, '');
				}
				col = parseLine(col, doc);
				var ui = '<th align="';
				var c = cfgLine[i];
				if (c === 1) ui += 'center';
				else if (c === 2) ui += 'right';
				else ui += 'left';
				if (sortable) {
					ui += '" sortable="true';
				}
				ui += '"';
				if (hidden) ui += ' hidden="true"';
				ui += '>' + col + '</td>';
				html += ui;
			});
			html += '</tr></thead>';
		}
		html += '<tbody>';

		// 判断是否需要计算
		var calculations = [];
		rows.forEach((row, j) => {
			row.forEach((col, i) => {
				var match = col.match(/^[　\s]*CAL(\d*)=[　\s]*(.*)[　\s]*$/);
				if (!match) return;
				var level = match[1] * 1;
				if (isNaN(level) || level < 1) level = 1;
				var equation = match[2];
				calculations[i] = [level, equation, j + 1];
			});
		});
		// if (calculations.length > 0) {
		// 	calculateTable(rows, calculations);
		// }

		var datum = []; // 将值传递给外部
		rows.forEach((row, j) => {
			html += '<tr>';
			var dataRow = [];
			row.forEach((col, i) => {
				col = parseLine(col, doc);
				var value = col.replace(/<.*?>/gi, '');
				dataRow[i] = value.trim();
				var ui = '<td align="';
				var c = cfgLine[i];
				if (c === 1) ui += 'center';
				else if (c === 2) ui += 'right';
				else ui += 'left';
				ui += '"';
				if (hiddenColumns[i]) ui += ' hidden="true"';
				ui += '>' + col + '</td>';
				html += ui;
			});
			html += '</tr>';
			datum[j] = dataRow;
		});

		html += '</tbody></table>';
		doc.tables = doc.tables || {};
		doc.tables[name] = datum;

		var key = 'table-' + generateRandomKey();
		caches[key] = html;

		header = table[0][0];
		total = table.length;
		for (let i = 0; i < total; i ++) {
			let line = table[i];
			let id = line[0];
			contents[id] = null;
			delete blockMap[id];
			let j = blocks.indexOf(line);
			if (j >= 0) blocks.splice(j, 1);
			line[0] = -1;
		}
		contents[header] = '%' + key + '%';
	};
	const parseTableRow = line => {
		if (line.substr(0, 1) !== '|') line = '|' + line;
		if (line.substr(line.length - 1, 1) !== '|') line = line + '|';
		var total = line.length, level = 0, parts = [], last = 0;
		for (let i = 1; i < total; i ++) {
			let c = line.substr(i, 1);
			if (c === '|' && level === 0) {
				parts.push(line.substr(last + 1, i - last - 1));
				last = i;
				continue;
			}
			if (('([{<').indexOf(c) >= 0) level ++;
			else if (('>}])').indexOf(c) >= 0) level --;
		}
		return parts;
	};
	const generateQuotes = (quotes, blocks, blockMap, contents, doc, caches) => {
		// 获取引用类型
		var type = 'quote';
		var list = contents[quotes[0][0]];
		list = list.match(/^>[　\s]*\[([\w\W]+?)\]/);
		if (!!list) {
			let t = list[1];
			t = t.replace(/^[　\s]+|[　\s]+$/g, '');
			if (t.length > 0) {
				if (!doc.metas[t] && !doc.blocks[t]) {
					type = t;
				}
			}
		}

		// 整理文档
		var indent = '';
		quotes.some(info => {
			const id = info[0];
			var ctx = contents[id];
			var head = ctx.match(/^[　\s]*/)[0];
			if (!head) return;
			indent = head.replace(/　/g, '  ').replace(/\t/g, '    ');
			return true;
		});
		list = quotes.map(info => {
			const id = info[0];
			var ctx = contents[id];
			var head = ctx.match(/^[　\s]*/)[0];
			if (!head) {
				ctx = ctx.replace(/^>[　\s]*(\[([\w\W]+?)\])?[　\s]*/, '');
			}
			else {
				let prefix = head.replace(/　/g, '  ').replace(/\t/g, '    ');
				ctx = ctx.replace(head, prefix).replace(indent, '');
				prefix = ctx.match(/^ */)[0];
				if (prefix.length === 1) ctx = ' ' + ctx;
			}
			return ctx;
		});
		list = list.join('\n');
		list = list.replace(/^\n+|\n+$/g, '');

		var html = '<blockquote class="' + type + '">';
		list = parseSection(list, doc, 2, caches);
		html += list;
		html += '</blockquote>';
		var key = 'blockquote-' + generateRandomKey();
		caches[key] = html;
		quotes.forEach(info => {
			var id = info[0];
			contents[id] = null;
			delete blockMap[id];
			var j = blocks.indexOf(info[1]);
			if (j >= 0) blocks.splice(j, 1);
		});
		contents[quotes[0][0]] = '%' + key + '%';
	};
	const generateList = (ordered, quotes, blocks, blockMap, contents, doc, caches) => {
		// 整理层级结构
		var list = [], lid = -1, start = -1;
		quotes.forEach(info => {
			var id = info[0];
			var ctx = contents[id];
			if (ordered && start < 0) {
				let match = ctx.match(/^\s*(\d+)\./);
				if (!!match && !!match[1]) {
					start = match[1] * 1;
				}
			}
			head = ctx.match(/^([\-\+\*>~]|\d+\.)[　\s]+/);
			// 如果是列表项
			if (!!head) {
				ctx = ctx.replace(head[0], '');
				lid ++;
				list[lid] = [ctx];
			}
			// 缩进项
			else {
				let prefix = ctx.match(/^[　\s]*/)[0];
				const content = ctx.replace(prefix, '');
				prefix = prefix.replace(/　/g, '  ').replace(/\t/g, '    ');
				list[lid].push(prefix + content);
			}
		});
		// 整理每一项的缩进
		list = list.map(item => {
			if (item.length <= 1) return item[0];
			const indent = item[1].match(/^ */)[0];
			item = item.map(line => {
				line = line.replace(indent, '');
				let head = line.match(/^ */)[0];
				if (head.length === 1) line = ' ' + line;
				return line;
			});
			return item.join('\n');
		});

		var html = '';
		if (ordered) {
			if (start > 0) {
				html = '<ol start="' + start + '">'
			}
			else {
				html = '<ol>';
			}
		}
		else html = '<ul>';
		list.forEach(item => {
			html += '<li>';
			html += parseSection(item, doc, 2, caches);
			html += '</li>';
		});
		if (ordered) html += '</ol>';
		else html += '</ul>';

		var key = 'list-' + generateRandomKey();
		caches[key] = html;
		quotes.forEach(info => {
			var id = info[0];
			contents[id] = null;
			delete blockMap[id];
			var j = blocks.indexOf(info[1]);
			if (j >= 0) blocks.splice(j, 1);
		});
		contents[quotes[0][0]] = '%' + key + '%';
	};

	const analyzeSections = (contents, doc) => {
		var sections = [[]], pid = 0, chaps = [0];
		var chapList = [];
		contents.forEach(line => {
			var changed = false;
			line = line.replace(/^<h(\d+)>/i, (match, level) => {
				changed = true;
				level = level * 1;
				if (level === 1) {
					pid ++;
					sections[pid] = [];
				}
				chaps[level - 1] = (chaps[level - 1] || 0) + 1;
				for (let i = level; i < chaps.length; i ++) chaps[i] = 0;
				var chapName = 'chap';
				for (let i = 0; i < level; i ++) chapName += '-' + (chaps[i] || 1);
				match = match + '<a name="' + chapName + '">';
				var capName = line.replace(/<[\w\W]+?>/gi, '');
				if (!!MarkUp.FocusPlaceholder) capName = capName.replace(MarkUp.FocusPlaceholder, '');
				chapList.push([level, chapName, capName]);
				return match;
			})
			.replace(/<\/h(\d+)>$/i, match => '</a>' + match)
			.replace(/\{([\w \-\.]+)\}/g, (match, name) => {
				var title = doc.termList[name];
				if (!title) return match;
				if (Array.isArray(title)) title = title[0];
				return '<a class="terminology" name="' + name + '" href="#ref-' + name + '"><strong>' + title + '</strong></a>';
			});
			sections[pid].push(line);
		});
		sections = sections.filter(group => group.length > 0);
		doc.chapList = chapList;

		// 处理脚注
		sections = applyFootNotes(sections, doc);

		// 处理尾注
		if (!!doc.endnotes && doc.endnotes.length > 0) {
			sections.push(applyEndNotes(doc));
		}

		// 处理术语表
		if (doc.metas.glossary && !!doc.termList && doc.termList.length > 0) {
			let html = '<hr class="endnote-line">';
			if (doc.metas.singleSection) {
				html += '<h1 class="endnote-title"><a name="Glossary">术语表</a></h1>';
			}
			else {
				html += '<section class="endnote-chapter"><h1 class="endnote-title"><a name="Glossary">术语表</a></h1>';
			}
			html += generateGlossary(doc);
			if (!doc.metas.singleSection) html += '</section>';
			sections.push(html);
		}

		// 处理资源表
		doc.image = doc.image || [];
		doc.video = doc.video || [];
		doc.audio = doc.audio || [];
		if (doc.metas.resources && doc.image.length + doc.video.length + doc.audio.length > 0) {
			let html = '<hr class="endnote-line">';
			if (doc.metas.singleSection) {
				html += '<h1 class="endnote-title"><a name="ResourceList">资源表</a></h1>';
			}
			else {
				html += '<section class="endnote-chapter"><h1 class="endnote-title"><a name="ResourceList">资源表</a></h1>';
			}
			if (doc.image.length > 0) {
				html += '<h2><a name="ImageResourceList">图片</a></h2>';
				html += generateResourceList(doc, 'image');
			}
			if (doc.video.length > 0) {
				html += '<h2><a name="VideoResourceList">视频</a></h2>';
				html += generateResourceList(doc, 'video');
			}
			if (doc.audio.length > 0) {
				html += '<h2><a name="AudioResourceList">音频</a></h2>';
				html += generateResourceList(doc, 'audio');
			}
			if (!doc.metas.singleSection) html += '</section>';
			sections.push(html);
		}

		// 处理标题
		if (doc.metas.showtitle) {
			let ui = '<header class="article-title">';
			ui += '<p>' + doc.metas.title + '</p>';
			if (doc.metas.showauthor) {
				if (!!doc.metas.author) {
					ui += '<p class="author">';
					if (!!doc.metas.email) ui += '<a href="mailto:' + doc.metas.email + '">';
					ui += doc.metas.author;
					if (!!doc.metas.email) ui += '</a>';
					ui += '</p>';
				}
				if (!!doc.metas.publish) {
					ui += '<p class="author date publish">';
					let date = doc.metas.publish * 1;
					if (isNaN(date)) date = doc.metas.publish;
					else {
						date = new Date(date);
						let y = date.getYear() + 1900;
						let m = date.getMonth() + 1;
						if (m < 10) m = '0' + m;
						let d = date.getDate();
						if (d < 10) d = '0' + d;
						let h = date.getHours();
						if (h < 10) h = '0' + h;
						let n = date.getMinutes();
						if (n < 10) n = '0' + n;
						let s = date.getSeconds();
						if (s < 10) s = '0' + s;
						date = y + '/' + m + '/' + d + ' ' + h + ':' + n + ':' + s;
					}
					ui += date;
					ui += '</p>';
				}
				if (!!doc.metas.update) {
					ui += '<p class="author date update">';
					let date = doc.metas.update * 1;
					if (isNaN(date)) date = doc.metas.update;
					else {
						date = new Date(date);
						let y = date.getYear() + 1900;
						let m = date.getMonth() + 1;
						if (m < 10) m = '0' + m;
						let d = date.getDate();
						if (d < 10) d = '0' + d;
						let h = date.getHours();
						if (h < 10) h = '0' + h;
						let n = date.getMinutes();
						if (n < 10) n = '0' + n;
						let s = date.getSeconds();
						if (s < 10) s = '0' + s;
						date = y + '/' + m + '/' + d + ' ' + h + ':' + n + ':' + s;
					}
					ui += date;
					ui += '</p>';
				}
			}
			ui += '</header>';
			sections.unshift(ui);
		}

		return sections;
	};
	const applyBlockReference = (text, doc) => {
		var changed = true, loop = 0;
		while (changed) {
			changed = false;
			text = text.map(line => {
				line = line.replace(/\[([\w \-\.]+?)\]/g, (match, name, pos) => {
					var supStart = line.lastIndexOf('<sup>', pos), supEnd = line.lastIndexOf('</sup>', pos);
					if (supStart > supEnd) return match;
					var content = doc.blocks[name];
					if (!content) return match;
					changed = true;
					return content;
				});
				return line;
			});
			loop ++;
			if (loop === 10) break;
		}
		return text;
	};
	const applyMarkUpReference = (sections, doc) => {
		var lang = (doc.metas.LANG || 'zh').toLowerCase();
		sections = sections.map(section => {
			// 生成术语表
			section = section.replace(/%glossary%/gi, (match) => {
				return generateGlossary(doc);
			});
			// 生成资源表
			section = section.replace(/%resources%/gi, (match) => {
				return generateResourceList(doc, 'image')
					+ generateResourceList(doc, 'video')
					+ generateResourceList(doc, 'audio');
			});
			section = section.replace(/%images%/gi, (match) => {
				return generateResourceList(doc, 'image');
			});
			section = section.replace(/%videos%/gi, (match) => {
				return generateResourceList(doc, 'video');
			});
			section = section.replace(/%audios%/gi, (match) => {
				return generateResourceList(doc, 'audio');
			});
			// 生成目录
			section = section.replace(/%toc%(\{[\w\W]+?\})*/gi, (match) => {
				var cfg = match.match(/\{[\w\W]+?\}/g);
				var title = '目录', level = 3;
				if (!!cfg) {
					cfg.forEach(c => {
						c = c.substr(1, c.length - 2);
						var n = c * 1;
						if (isNaN(n)) title = c;
						else level = n;
					});
				}
				doc.toced = true;
				return generateTableOfContent(doc, title, level);
			});

			// 替换文档元数据
			Object.keys(doc.metas).forEach(key => {
				var content = key.toLowerCase();
				if (PreservedKeywords.includes(key)) return;
				content = doc.metas[key];
				if (content === true || content === false) {
					if (lang === 'zh') content = content ? '是' : '否';
					else content = content ? 'On' : 'Off';
				}
				else if (Array.isArray(content)) {
					if (lang === 'zh') content = content.join('、');
					else content = content.join(', ');
				}
				section = section.replace(new RegExp('%' + key + '%(\{.*?\})?', 'gi'), (match, param) => {
					param = param || 'YYYY/MM/DD';
					var output = content;
					if (TimeStampKeywords.includes(key.toLowerCase())) {
						output = generateTimeStamp(content, param.replace(/^\{|\}$/g, ''));
					}
					return output;
				});
			});

			// 处理最终不用处理的块
			section = section.replace(/%([\w \-\.]+)%/g, (match, key) => {
				var content = doc.finals[key];
				if (!content) return match;
				return content;
			});

			return section;
		});
		// 如果没生成过目录，且生成目录开关已打开，则在文档头补熵目录
		if (doc.metas.toc && !doc.toced) {
			let toc = generateTableOfContent(doc, '目录', 3);
			if (toc.indexOf('<p class="content-') >= 0) {
				toc = '<section>' + toc + '</section>';
				if (doc.metas.showtitle) {
					sections.splice(1, 0, toc);
				}
				else {
					sections.unshift(toc);
				}
			}
		}
		return sections;
	};
	const applyFootNotes = (sections, doc) => {
		sections = sections.map(para => {
			var footnotes = [];
			var prefix = '', postfix = '';
			if (!doc.metas.singleSection)  {
				prefix = '<section>';
				postfix = '</section>';
			}
			para.forEach((line, lid) => {
				var changed = false;
				line = line.replace(/<a class="notemark" type="footnote" name="([\w \-\.]+?)">/g, (match, fn) => {
					changed = true;
					footnotes.push(fn);
					var content = match.substr(0, match.length - 1) + ' href="#footnote-' + fn + '">';
					return content;
				});
				if (changed) para[lid] = line;
			});
			para = para.join('');
			if (footnotes.length === 0) return prefix + para + postfix;
			footnotes = footnotes.map((name, i) => {
				var content = doc.refs[name];
				var id = doc.footnotes.indexOf(name);
				i ++;
				para = para.replace(new RegExp('%%FN-' + id + '%%', 'g'), i);
				return '<p class="footnote-content"><a class="index" name="footnote-' + name + '">' + i + '：</a>' + content + '</p>';
			});
			para += '<hr class="footnote-line"><footer><p class="footnote-title">脚注：</p>';
			para += footnotes.join('');
			para += '</footer><hr class="footnote-line end">';
			return prefix + para + postfix;
		});
		return sections;
	};
	const applyEndNotes = (doc) => {
		let html = '<hr class="endnote-line">';
		if (doc.metas.singleSection) {
			html += '<h1 class="endnote-title"><a name="EndNote">尾注</a></h1>';
		}
		else {
			html += '<section class="endnote-chapter"><h1 class="endnote-title"><a name="EndNote">尾注</a></h1>';
		}
		doc.endnotes.forEach((en, i) => {
			html += '<p class="endnote-content"><a class="index" name="endnote-' + en + '">' + (i + 1) + '：</a>' + doc.refs[en] + '</p>';
		});
		if (!doc.metas.singleSection) html += '</section>';
		return html;
	};
	const generateTableOfContent = (doc, title, level) => {
		var html = '<h1 name="ContentTable">' + title + '</h1><aside class="content-table">';
		doc.chapList.forEach(info => {
			if (info[0] > level) return;
			var ui = '<p class="content-item level-' + info[0] + '">';
			for (let i = 0; i < info[0]; i ++) {
				ui += '<span class="content-indent"></span>';
			}
			ui += '<a class="content-link" href="#' + info[1] + '">' + info[2] + '</a>';
			ui += '</p>';
			html += ui;
		});
		if (!!doc.endnotes && doc.endnotes.length > 0) {
			html += '<p class="content-item level-1"><span class="content-indent"></span><a class="content-link" href="#EndNote">尾注</a></p>';
		}
		if (doc.metas.glossary && !!doc.termList && doc.termList.length > 0) {
			html += '<p class="content-item level-1"><span class="content-indent"></span><a class="content-link" href="#Glossary">术语表</a></p>';
		}
		if (doc.metas.resources && doc.image.length + doc.video.length + doc.audio.length > 0) {
			html += '<p class="content-item level-1"><span class="content-indent"></span><a class="content-link" href="#ResourceList">资源表</a></p>';
			if (doc.image.length > 0) {
				html += '<p class="content-item level-2"><span class="content-indent"></span><span class="content-indent"></span><a class="content-link" href="#ImageResourceList">图片</a></p>';
			}
			if (doc.video.length > 0) {
				html += '<p class="content-item level-2"><span class="content-indent"></span><span class="content-indent"></span><a class="content-link" href="#VideoResourceList">视频</a></p>';
			}
			if (doc.audio.length > 0) {
				html += '<p class="content-item level-2"><span class="content-indent"></span><span class="content-indent"></span><a class="content-link" href="#AudioResourceList">音频</a></p>';
			}
		}
		html += '</aside>';
		return html;
	};
	const generateGlossary = (doc) => {
		var html = '';
		if (doc.termList === 0) return '';
		doc.termList.forEach(item => {
			var [key, title] = item;
			var content = doc.terms[key];
			var ui = '<p class="glossary-item">'
			ui += '<a class="glossary-indent" name="ref-' + key + '">' + title + '</a>';
			ui += content;
			ui += '</p>';
			html += ui;
		});
		return html;
	};
	const generateResourceList = (doc, type) => {
		var resources = doc[type];
		if (!resources || !Array.isArray(resources) || resources.length === 0) return '';
		var list = [];
		var ui = '<ul>';
		resources.forEach(item => {
			var res = item[1];
			res = res.replace(/\%([\w \-]+?)\%/g, (match, mark) => {
				var word = ReversePreserveWords[mark.toLowerCase()];
				if (!!word) return word;
				return match;
			});
			if (list.includes(res)) return;
			list.push(res);
			ui += '<li><a href="' + res + '" target="_blank">' + res + '</a></li>';
		});
		ui += '</ul>';
		return ui;
	};
	const generateTimeStamp = (stamp, format) => {
		var date = new Date(stamp);
		var year = date.getFullYear();
		var month = date.getMonth() + 1;
		var day = date.getDate();
		var hour = date.getHours();
		var minute = date.getMinutes();
		var second = date.getSeconds();
		var millisec = date.getMilliseconds();
		var hint;
		hint = format.match(/Y+/);
		if (!!hint) format = convertTimeStamp(format, hint[0], year, hint[0].length > 2 ? 4 : 2);
		hint = format.match(/M+/);
		if (!!hint) format = convertTimeStamp(format, hint[0], month);
		hint = format.match(/D+/);
		if (!!hint) format = convertTimeStamp(format, hint[0], day);
		hint = format.match(/h+/);
		if (!!hint) format = convertTimeStamp(format, hint[0], hour);
		hint = format.match(/m+/);
		if (!!hint) format = convertTimeStamp(format, hint[0], minute);
		hint = format.match(/s+/);
		if (!!hint) format = convertTimeStamp(format, hint[0], second);
		hint = format.match(/ms/);
		if (!!hint) format = convertTimeStamp(format, hint[0], millisec, 3);
		return format;
	};
	const convertTimeStamp = (stamp, hint, value, max=2) => {
		var len = hint.length;
		valur = '' + value;
		while (value.length < len) {
			value = '0' + value;
		}
		if (value.length > max) {
			value = value.substring(value.length - max);
		}
		return stamp.replace(hint, value);
	};

	// 保留字符处理
	const convertPreserves = content => {
		content = content.replace(/(\\+)(.)/g, (match, slash, mark) => {
			var count = Math.floor(slash.length / 2);
			var needConvert = (count * 2 !== slash.length);
			var result = '';
			var meta = '%' + PreserveWords['\\'] + '%';
			for (let i = 0; i < count; i ++) result += meta
			if (needConvert) {
				let word = PreserveWords[mark];
				if (!word) result = result + mark;
				else result = result + '%' + word + '%';
			}
			else {
				result = result + mark;
			}
			return result;
		});
		return content;
	};
	const restorePreserves = (content, caches, inline=true) => {
		var changed = true;
		while (changed) {
			changed = false;
			content = content.replace(/\%([\w \-]+?)\%/g, (match, mark) => {
				var word = caches[mark];
				if (!!word) {
					changed = true;
					return word;
				}
				return match;
			});
			content = content.replace(/\%<span class="english">([\w \-]+?)(<\/span>\%|\%<\/span>)/g, (match, mark) => {
				var word = caches[mark];
				if (!!word) {
					changed = true;
					return word;
				}
				return match;
			});
		}

		if (!inline) return content;

		changed = true;
		while (changed) {
			changed = false;
			content = content.replace(/\%([\w \-]+?)\%/g, (match, mark) => {
				var word = caches[SymHidden][mark.toLowerCase()];
				if (!!word) {
					changed = true;
					return word;
				}
				return match;
			});
			content = content.replace(/\%<span class="english">([\w \-]+?)(<\/span>\%|\%<\/span>)/g, (match, mark) => {
				var word = caches[SymHidden][mark.toLowerCase()];
				if (!!word) {
					changed = true;
					return word;
				}
				return match;
			});
		}

		// 处理软换行
		content = content.replace(/\n+/g, '<br>');
		content = content.replace(/\/{2}/g, (match, pos) => {
			if (pos === 0) return '<br>';
			var prev = content.substr(pos - 1, 1);
			if (prev === ':') return match;
			return '<br>';
		});
		content = content.replace(/^(<\/?br>)+|(<\/?br>)+$/gi, '<br>');
		return content;
	};
	const getKeywords = words => {
		if (!words) return [];
		words = words.split(/[ ,，；;、　]+/).filter(w => w.length > 0);
		var list = [];
		words.forEach(w => {
			if (list.includes(w)) return;
			list.push(w);
		});
		return list;
	};

	// 解析元数据
	const getMetas = (doc, text) => {
		var metas = {};
		var nonStop = true;

		// 解析文档元数据
		for (let name in MetaAlias) {
			let key = MetaAlias[name];
			var reg = new RegExp('(^|\\n)' + name + '[:：][ 　\\t]*([^\\n]*?)(\\n|$)', 'gi');
			text = text.replace(reg, (match, head, value, tail) => {
				metas[key] = value;
				return head + tail;
			});
		}
		MetaWords.forEach(key => {
			var reg = new RegExp('(^|\\n)' + key + '[:：][ 　\\t]*([^\\n]*?)(\\n|$)', 'gi');
			text = text.replace(reg, (match, head, value, tail) => {
				metas[key] = value;
				return head + tail;
			});
		});

		if (!!metas.showtitle && ['on', 'yes', 'true'].includes(metas.showtitle.toLowerCase())) metas.showtitle = true;
		else metas.showtitle = undefined;
		if (!!metas.glossary && ['on', 'yes', 'true'].includes(metas.glossary.toLowerCase())) metas.glossary = true;
		else metas.glossary = undefined;
		if (!!metas.links && ['on', 'yes', 'true'].includes(metas.links.toLowerCase())) metas.links = true;
		else metas.links = undefined;
		if (!!metas.refs && ['on', 'yes', 'true'].includes(metas.refs.toLowerCase())) metas.refs = true;
		else metas.refs = undefined;
		if (!!metas.terms && ['on', 'yes', 'true'].includes(metas.terms.toLowerCase())) metas.terms = true;
		else metas.terms = undefined;
		if (!!metas.resources && ['on', 'yes', 'true'].includes(metas.resources.toLowerCase())) metas.resources = true;
		else metas.resources = undefined;
		if (!!metas.toc && ['on', 'yes', 'true'].includes(metas.toc.toLowerCase())) metas.toc = true;
		else metas.toc = undefined;
		doc.metas = metas;
		doc.metas.keywords = getKeywords(doc.metas.keywords);
		if (!!doc.metas.update) {
			try {
				doc.metas.update = (new Date(doc.metas.update)).getTime();
			}
			catch (err) {
				delete doc.metas.update;
			}
		}
		if (!!doc.metas.publish) {
			try {
				doc.metas.publish = (new Date(doc.metas.publish)).getTime();
			}
			catch (err) {
				delete doc.metas.publish;
			}
		}
		if (!!doc.metas.update && !doc.metas.publish) {
			doc.metas.publish = doc.metas.update;
			delete doc.metas.update;
		}
		doc.metas.god = doc.metas.theone = '<a href="mailto:lostabaddon@gmail.com">LostAbaddon</a>';
		if (doc.metas.script) {
			doc.metas.script = doc.metas.script.split(/[,;　\s]+/);
		}
		else doc.metas.script = [];
		if (doc.metas.style) {
			doc.metas.style = doc.metas.style.split(/[,;　\s]+/).map(style => {
				return style.replace(/\{[\w\W]*\}/, '');
			});
		}
		else doc.metas.style = [];
		doc.termList = doc.termList || [];
		doc.mainParser = false;

		// 解析引用文本
		doc.refs = {};
		nonStop = true;
		while (nonStop) {
			nonStop = false;
			text = text.replace(/\n\[([\w \-\.\+\=\\\/]+?)\] *[:：] *([\w\W]+?)\n([\n\[])/, (match, key, value, left, pos) => {
				key = key.trim();
				value = value.trim();
				if (key.length === 0 || value.length === 0) return match;
				doc.refs[key] = value;
				nonStop = true;
				return '\n' + left;
			});
		}

		// 解析引用块
		doc.blocks = {};
		nonStop = true;
		while (nonStop) {
			nonStop = false;
			text = text.replace(/\[:([\w \-\.\+\=\\\/]+?):\]([\w\W]*?)\n*\[:\1:\]/g, (match, name, content) => {
				name = name.trim();
				if (name.length === 0 || content.length === 0) return;
				doc.blocks[name] = content;
				nonStop = true;
				return '';
			});
		}

		doc.anchors = [];
		doc.terms = {};
		doc.notes = {};
		text.replace(/\] *(\[[\^:]([\w ]+?)\]|\{([\w ]+?)\})/g, (match, usage, key1, key2) => {
			var key = key1 || key2;
			if (!doc.refs[key]) {
				if (usage.substr(0, 1) === '{' && !doc.anchors.includes(key)) doc.anchors.push(key);
			}
			else if (usage.substr(0, 1) === '{') {
				doc.terms[key] = key;
			}
			else {
				doc.notes[key] = key;
			}
		});


		// 合并回文档
		text = regularize(text);

		return text;
	};

	// 将MarkUp解析为HTML
	MarkUp.fullParse = (text, config) => {
		var docTree = {
			finals: {},
			toced: false,
		};

		config = config || {};

		// 去除文档元数据
		var wordCount = text
			.replace(/\n标题[:：][　\s]*/gi, '\n')
			.replace(/\n作者[:：][　\s]*/gi, '\n')
			.replace(/\n简介[:：][　\s]*/gi, '\n')
			.replace(/\n关键词[:：][　\s]*/gi, '\n')
			.replace(/\n发布[:：][　\s]*/gi, '\n')
			.replace(/\n更新[:：][　\s]*/gi, '\n')
		;
		MetaWords.forEach(key => {
			var reg = new RegExp('(^|\\n)' + key + '[:：][ 　\\t]*[^\\n]*?(\\n|$)', 'gi');
			wordCount = wordCount.replace(reg, '');
		});
		PreservedKeywords.forEach(key => {
			var reg = new RegExp('\\[' + key + '\\]', 'gi');
			wordCount = wordCount.replace(reg, '');
		});
		// 去除超链接等文档元素中的非文字部分
		while (true) {
			let next = wordCount
				.replace(/\[(.*?)\][　\s]*\[.*?\]/g, (match, inner) => inner)
				.replace(/\[(.*?)\][　\s]*\{.*?\}/g, (match, inner) => inner)
				.replace(/\[(.*?)\][　\s]*\(.*?\)/g, (match, inner) => inner)
				.replace(/<\w.*?\w>|<\w>/g, '')
				.replace(/\n[　\s]*(\-+|\++|#+|>|=+|\*+|~+|`+|\$+|\d+\.)[　\s]*/g, '\n')
			;
			if (wordCount === next) break;
			wordCount = next;
		}
		// 统计字数，英文以单词计
		wordCount = wordCount.match(/[\u4e00-\u9fa5]|[a-zA-Z0-9]+/gi) || '';
		wordCount = wordCount.length || 0;

		text = prepare(text);
		text = getMetas(docTree, text);
		docTree.parseLevel = 0;
		docTree.mainParser = true;
		docTree.metas.title = docTree.metas.title || '无名文';
		var keyList = Object.keys(docTree.metas);
		Object.keys(config).forEach(key => {
			if (keyList.includes(key)) return;
			keyList.push(key);
		});
		if (!!config.overwrite) {
			keyList.forEach(key => {
				docTree.metas[key] = (config[key] === null || config[key] === undefined) ? docTree.metas[key] : config[key];
			});
		}
		else {
			keyList.forEach(key => {
				docTree.metas[key] = (docTree.metas[key] === null || docTree.metas[key] === undefined) ? config[key] : docTree.metas[key];
			});
		}
		// 对未定义的属性做默认化
		keyList.forEach(key => {
			if (docTree.metas[key] === null || docTree.metas[key] === undefined) docTree.metas[key] = false;
		});

		// 主体解析
		text = parseSection(text, docTree);

		// 处理术语等模块
		Object.keys(docTree.refs).forEach(key => {
			var line = docTree.refs[key];
			line = parseLine(line, docTree);
			// 恢复保留字
			line = line.replace(/\%([\w \-]+?)\%/g, (match, mark) => {
				var word = ReversePreserveWords[mark.toLowerCase()];
				if (!!word) return word;
				return match;
			});
			docTree.refs[key] = line;
		});
		Object.keys(docTree.blocks).forEach(key => {
			var line = docTree.blocks[key];
			var header = line.match(/^\n+/);
			line = line.trim();
			var content;
			docTree.parseLevel = 0;
			if (!header) content = [parseLine(line, docTree)];
			else content = parseSection(line, docTree, 1);
			docTree.blocks[key] = content.join('');
		});
		for (let key in docTree.terms) {
			docTree.terms[key] = docTree.refs[key];
		}
		for (let key in docTree.notes) {
			docTree.notes[key] = docTree.refs[key];
		}

		// 恢复保留字
		text = text.map(content => {
			content = content.replace(/\%([\w \-]+?)\%/g, (match, mark) => {
				var word = ReversePreserveWords[mark.toLowerCase()];
				if (!!word) return word;
				return match;
			});
			content = content.replace(/\%<span class="english">([\w \-]+?)(<\/span>\%|\%<\/span>)/g, (match, mark) => {
				var word = ReversePreserveWords[mark.toLowerCase()];
				if (!!word) return word;
				return match;
			});
			return content;
		});

		// 实现引用块
		text = applyBlockReference(text, docTree);

		// 开始划分章节
		text = analyzeSections(text, docTree);

		// 处理系统级引用
		text = applyMarkUpReference(text, docTree);

		if (docTree.metas.singleSection) text = text.join('');
		else if (docTree.metas.classname) text = '<article class="' + docTree.metas.classname + '">' + text.join('') + '</article>';
		else text = '<article>' + text.join('') + '</article>';

		if (docTree.metas.fullexport) {
			docTree.metas.style.forEach(line => {
				text += '<link type="text/css" rel="stylesheet" href="' + line + '">';
			});
			docTree.metas.script.forEach(line => {
				text += '<script type="text/javascript" src="' + line + '"></script>';
			});
		}

		var indexes = FinalRender['_indexes_'] || [];
		indexes.forEach(index => {
			var renderList = FinalRender[index];
			if (!renderList) return;
			renderList.forEach(render => {
				text = render.parse(text, docTree);
			});
		});

		// 去除空行
		text = text.replace(/<p>(<br\/?>)+<\/p>/gi, '');

		var result = {};
		result.content = text;
		result.title = docTree.metas.title;
		result.lineCount = docTree.metas.totalLineCount;
		result.chapList = docTree.chapList;
		result.tables = docTree.tables;

		result.meta = {};
		result.meta.author = docTree.metas.author;
		result.meta.email = docTree.metas.email;
		result.meta.description = docTree.metas.description;
		result.meta.publish = docTree.metas.publish;
		result.meta.update = docTree.metas.update;
		result.meta.keywords = docTree.metas.keywords.map(kw => kw);
		if (!!docTree.metas.others) result.meta.others = docTree.metas.others;

		result.terminology = {};
		docTree.termList.forEach(item => {
			result.terminology[item[0]] = item[1];
		});

		result.notes = {};
		Object.keys(docTree.refs).forEach(name => {
			result.notes[name] = docTree.refs[name];
		});

		result.blocks = {};
		Object.keys(docTree.refs).forEach(name => {
			result.blocks[name] = docTree.blocks[name];
		});

		result.wordCount = wordCount;

		return result;
	};
	MarkUp.parse = (text, config) => {
		var result;
		result = MarkUp.fullParse(text, config);
		if (!result) return '';
		return result.content;
	};

	const reverseSection = (section, config) => {
		config.__level ++;
		var contents = [], line = '', singleLine = true;
		section.childNodes.forEach(n => {
			var tag = n.tagName;
			if (!tag) {
				if (n.nodeName === '#comment') return;
				let inner = n.textContent || '';
				inner = inner.trim();
				if (inner.length > 0) line += inner;
				return;
			}

			tag = tag.trim().toLowerCase();
			var inner;
			if (ParagraphTags.includes(tag)) {
				singleLine = false;
				if (line.length > 0) {
					contents.push(config.__prefix + line);
					line = '';
				}

				if (tag === 'blockquote') {
					let lastPrefix = config.__prefix;
					config.__prefix = config.__prefix + '>\t';
					inner = reverseSection(n, config);
					inner = inner.flat(Infinity);
					inner.push('\n');
					config.__prefix = lastPrefix;
				}
				else if (tag === 'ol') {
					let lastPrefix = config.__prefix;
					if (config.__prefix.indexOf('-\t') >= 0 || config.__prefix.indexOf('1.\t') >= 0) config.__prefix = '\t' + config.__prefix;
					else config.__prefix = config.__prefix + '1.\t';
					inner = reverseSection(n, config);
					inner = inner.flat(Infinity);
					inner.push('');
					config.__prefix = lastPrefix;
				}
				else if (tag === 'ul') {
					let lastPrefix = config.__prefix;
					if (config.__prefix.indexOf('-\t') >= 0 || config.__prefix.indexOf('1.\t') >= 0) config.__prefix = '\t' + config.__prefix;
					else config.__prefix = config.__prefix + '-\t';
					inner = reverseSection(n, config);
					inner = inner.flat(Infinity);
					inner.push('');
					config.__prefix = lastPrefix;
				}
				else {
					inner = reverseSection(n, config);
					inner = inner.flat(Infinity);
					inner.push('');
				}
				if (!!inner && inner.length > 0) contents.push(...inner);
			}
			else {
				let [inner, isInline] = reverseMix(n, tag, config);
				if (isInline) {
					if (inner.length > 0) {
						line += inner.join('');
					}
				}
				else {
					if (line.length > 0) {
						contents.push(config.__prefix + line);
						line = '';
					}
					inner.forEach(l => {
						contents.push(config.__prefix + l);
					});
				}
			}
		});
		if (line.length > 0) contents.push(config.__prefix + line);
		config.__level --;
		return contents;
	};
	const reverseLine = (node, config) => {
		var line = '';
		node.childNodes.forEach(n => {
			var tag = n.tagName;
			if (!tag) {
				if (n.nodeName === '#comment') return;
				let inner = n.textContent || '';
				inner = inner.trim();
				if (inner.length > 0) line += inner;
				return;
			}

			tag = tag.trim().toLowerCase();
			if (tag === 'a') {
				let url = n.href;
				if (url.indexOf('javascript:') === 0) url = '';
				let inner = reverseLine(n, config);
				if (!url || url.substr(0, 1) === '#') {
					line += inner;
				}
				else {
					if (!url.match(/^(ftp|https?):\/\//i)) url = config.host + url;
					inner = '[' + inner + '](' + url + ')';
					line += inner;
				}
				return;
			}
			if (tag === 'span' || tag === 'font') {
				let inner = reverseLine(n, config);
				line += inner;
				return;
			}
			if (tag === 'strong' || tag === 'b') {
				let inner = reverseLine(n, config);
				line += inner;
				return;
			}
			if (tag === 'em' || tag === 'i') {
				let inner = reverseLine(n, config);
				line += inner;
				return;
			}
			if (tag === 'sup') {
				let inner = reverseLine(n, config);
				line += inner;
				return;
			}
			if (tag === 'sub') {
				let inner = reverseLine(n, config);
				line += inner;
				return;
			}
			if (tag === 'del') {
				let inner = reverseLine(n, config);
				line += inner;
				return;
			}
			line += n.innerText;
		});
		return line;
	};
	const reverseMix = (node, tag, config) => {
		if (tag === 'script') return [[''], true];
		if (tag === 'style') return [[''], true];
		if (tag === 'link') return [[''], true];
		if (tag === 'hr') return [['\n---\n'], false];
		if (tag === 'br') return [['\n'], true];
		if (tag.match(/^h\d+$/)) {
			let lev = tag.substring(1, tag.length);
			lev *= 1;
			let prefix = '\n';
			for (let i = 0; i < lev; i ++) prefix += '#';
			let line = reverseLine(node, config);
			line = prefix + line + '\n';
			return [[line], false];
		}
		if (tag === 'a') {
			let url = node.href;
			if (url.indexOf('javascript:') === 0) url = '';
			let inner = reverseLine(node, config);
			if (!url || url.substr(0, 1) === '#') return [[inner], true];
			if (!url.match(/^(ftp|https?):\/\//i)) url = config.host + url;
			inner = '[' + inner + '](' + url + ')';
			return [[inner], true];
		}
		if (tag === 'img') {
			if (node.src.length === 0) return [[''], true];
			let inner = '\n![](' + node.src + ')\n';
			return [[inner], false];
		}
		if (tag === 'video') {
			if (node.src.length === 0) return [[''], true];
			let inner = '\n@[](' + node.src + ')\n';
			return [[inner], true];
		}
		if (tag === 'audio') {
			if (node.src.length === 0) return [[''], true];
			let inner = '\n#[](' + node.src + ')\n';
			return [[inner], true];
		}
		if (tag === 'span' || tag === 'font') {
			let inner = reverseLine(node, config);
			return [[inner], true];
		}
		if (tag === 'strong' || tag === 'b') {
			let inner = reverseLine(node, config);
			return [['**' + inner + '**'], true];
		}
		if (tag === 'em' || tag === 'i') {
			let inner = reverseLine(node, config);
			return [['*' + inner + '*'], true];
		}
		if (tag === 'u') {
			let inner = reverseLine(node, config);
			return [['__' + inner + '__'], true];
		}
		if (tag === 'sup') {
			let inner = reverseLine(node, config);
			return [['^' + inner + '^'], true];
		}
		if (tag === 'sub') {
			let inner = reverseLine(node, config);
			return [['_' + inner + '_'], true];
		}
		if (tag === 'del') {
			let inner = reverseLine(node, config);
			return [['~~' + inner + '~~'], true];
		}
		var content = reverseLine(node, config);
		return [[content], false];
	};

	// 将HTML逆向表达为MarkUp
	MarkUp.plaintextReverse = (content) => {
		content = content.replace(/\r/g, '');
		content = content.replace(/<!(.*?|\s*?)*?>/g, '');
		content = content.replace(/<xml(.*?|\s*?)*?>[\w\W]*?<\/xml>/gi, '');
		content = content.replace(/<style(.*?|\s*?)*?>[\w\W]*?<\/style>/gi, '');
		content = content.replace(/<(\/?\w+).*?>/g, (match, tag) => {
			tag = tag.toLowerCase();
			// 处理超链接，移除无用属性
			if (tag === 'a') {
				let m = match.match(/href=('|")(.*?)\1/i);
				if (!m) return '<a>';
				m = m[2];
				if (!m) return '<a>';
				return '<a src="' + m + '">'
			}
			// 处理图片，移除无用属性
			else if (tag === 'img') {
				let m = match.match(/src=('|")(.*?)\1/i);
				if (!m) return '<img>';
				m = m[2];
				if (!m) return '<img>';
				return '<img src="' + m + '">'
			}
			// 非P的段落标记全部处理为段落
			else if (['div', 'article', 'section', 'aside', 'nav', 'footer', 'header', 'foot'].includes(tag.replace('/', ''))) {
				if (tag.indexOf('/') === 0) return '</p>';
				return '<p>';
			}
			else return '<' + tag + '>';
		});
		content = content.replace(/<p([ \s](.*?))*?>/gi, '<p>');
		content = content.replace(/<\/?(html|head|body|span|lable|nobr|link|meta|w:\w*?|w|xml|o|m|style)([ \s](.*?))*?>/gi, ''); // 去除无用标签
		while (true) {
			let ctx = content;
			ctx = ctx.replace(/<(.*?)( .*?)*>(<\1( .*?)*>)*/gi, (match, tag) => '<' + tag + '>'); // 合并同类标签
			ctx = ctx.replace(/<(.*?)( .*?)*>[ 　\s]*<\/\1>/gi, ''); // 去除空标签
			// 去除标题内的段落标记
			ctx = ctx.replace(/<(h\d|blockquote|li|pre)([ \s](.*?))*?>(<p([ \s](.*?))*?>)*/gi, (match, head) => {
				return '<' + head + '>';
			});
			ctx = ctx.replace(/(<\/p>)+(<\/(h\d|blockquote|li|pre)>)/gi, (match, p, head) => head);
			if (ctx === content) break;
			content = ctx;
		}
		// 生成MarkUp标记
		// 先处理段内标记
		content = content.replace(/<\/?(b|strong)>/gi, '**');
		content = content.replace(/<\/?(i|em)>/gi, '*');
		content = content.replace(/<\/?sup>/gi, '^');
		content = content.replace(/<\/?sub>/gi, '_');
		content = content.replace(/<\/?u>/gi, '__');
		content = content.replace(/<\/?(del|strike)>/gi, '~~');
		content = content.replace(/<\/?code>/gi, '`');
		content = content.replace(/<a src=('|")(.*?)\1>(.*?)<\/a>/gi, (match, none, url, title) => {
			if (!url) return title;
			return '[' + title + '](' + url + ')';
		});
		content = content.replace(/<img src=('|")(.*?)\1>/gi, (match, none, url) => {
			if (!url) return '';
			return '\n![](' + url + ')\n';
		});
		// 处理段级标记
		content = content.replace(/<h(\d)>/gi, (match, level) => {
			var len = level.length;
			var tag = '';
			for (let i = 0; i < len; i ++) tag += '#';
			return tag + '\t';
		});
		content = content.replace(/<p>/gi, '');
		var isListOrder = false, listIndex = 1;
		content = content.replace(/<(ul|li|ol)>/gi, (match, tag) => {
			tag = tag.toLowerCase();
			if (tag === 'ol') {
				isListOrder = true;
				listIndex = 1;
				return '';
			}
			if (tag === 'ul') {
				isListOrder = false;
				listIndex = 1;
				return '';
			}
			if (isListOrder) {
				match = listIndex + '.\t';
				listIndex ++;
				return match
			}
			else {
				return '-\t';
			}
		});
		isListOrder = false;
		content = content.replace(/<(pre|\/pre|\/p)>/gi, (match, tag) => {
			tag = tag.toLowerCase();
			if (tag === 'pre') {
				isListOrder = true;
				return '``';
			}
			else if (tag === '/code') {
				isListOrder = false;
				return '``';
			}
			if (isListOrder) return '\n';
			return '\n\n';
		});
		content = content.replace(/<\/(h\d)>/gi, '\n\n');
		content = content.replace(/<\/?br\/?>/gi, '\n');
		content = content.replace(/<\/(li|ul|ol)>/gi, '\n');
		content = content.replace(/<(blockquote)>/gi, '>\t');
		content = content.replace(/<\/(blockquote)>/gi, '\n\n\n');
		content = content.replace(/<\/?hr\/?>/gi, '\n----\n\n');
		// 去除无效标签
		content = content.replace(/<.*?>/gi, '');
		// 去除前后空行
		content = content.replace(/(^[\n\r]+|[\n\r]+$)/gi, '');
		return content;
	};
	MarkUp.reverse = (ele, config, outmost=true) => {
		if (!ele) return '';
		if (config === 'plain' || config === 'plaintext') return MarkUp.plaintextReverse(ele);

		config = config || {};
		config.__level = 0;
		config.__prefix = '';
		config.host = config.host || '';
		var content = reverseSection(ele, config);
		content = content.flat(Infinity);
		content = content.join('\n');
		content = content.replace(/\n{2,}/g, '\n\n');
		return content;
	};

	// 将MarkUp转换为无格式文本
	MarkUp.fullPlainify = (text, config) => {
		PreservedKeywords.forEach(key => {
			var reg = new RegExp('\\[' + key + '\\]', 'gi');
			text = text.replace(reg, '');
		});

		var result = MarkUp.fullParse(text, config);
		// 将格式去除
		result.content = result.content.replace(/<(article|section|div|p|header|footer|aside|ul|ol|li|blockquote|pre|figure|figcaption|h\d|br|hr|table|tr|th|thead|tbody)(\s+\w+?(=('|")[^\n\r<>]+?\3)?)*\/?>/gi, '\n').trim();
		result.content = ('\n' + result.content + '\n').replace(/\n\$\$+\s*\n/gi, '\n').trim();
		result.content = ('\n' + result.content + '\n').replace(/\n(`{3}|~{3})\s*([\w\-\.\+=\?\~\\\/]*)\n/gi, '\n');
		result.content = result.content.replace(/<\/?(\w+)(\s+\w+?(=('|")[^\n\r<>]+?\3)?)*\/?>/gi, '').trim();
		result.content = result.content.replace(/\n\n+/gi, '\n').trim();
		return result;
	};
	MarkUp.plainify = (text, config) => {
		return MarkUp.fullPlainify(text, config).content;
	};

	MarkUp.parseLine = parseLine;
	MarkUp.parseSection = parseSection;

	MarkUp.generateRandomKey = generateRandomKey;

	MarkUp.SymHidden = SymHidden;
	MarkUp.PreserveWords = PreserveWords;
	MarkUp.Char2Dig = Char2Dig;

	try {
		globalThis.MarkUp = MarkUp;
	}
	catch (err) {
		try {
			global.MarkUp = MarkUp;
		}
		catch (err) {
			console.error(err);
		}
	}

	const FocusPlaceholder = '\u200D\u034F';
	const FocusClassName = "current-focus";
	const RegContainerHTMLTag = /<(?!(?:img|video|object|br|hr)\b)([a-zA-Z][a-zA-Z0-9]*)(?:\s+[^\n\r>]*?)?\/?>/g;
	MarkUp.FocusPlaceholder = FocusPlaceholder;
	MarkUp.FocusClassName = FocusClassName;
	MarkUp.RegContainerHTMLTag = RegContainerHTMLTag;
}) ();

/* Extensions for MarkUp */

// 超链接
MarkUp.addExtension({
	name: 'HyperLinks',
	parse: (line, doc, caches) => {
		let temp = line;
		doc.links = doc.links || [];
		var changed = false;
		line = line.replace(/([!@#]?)\[([^\n\r\[\]\(\)]*?(\[[^\n\r\[\]\(\)]*?\]|\([^\n\r\[\]\(\)]*?\))*?[^\n\r\[\]\(\)]*?)\][ \t]*\(([^\n\r\[\]\(\)]*?(\[[^\n\r\[\]\(\)]*?\]|\([^\n\r\[\]\(\)]*?\))*?[^\n\r\[\]\(\)]*?)\)/g, (match, prev, title, tinner, link, linner, pos) => {
			link = link.trim();
			if (link.length === 0) return match;
			if (title.match(/^[a-z]+:\d+$/i)) return match;
			if (!!caches[title]) return match;

			if (prev === '') {
				doc.links.push([title, link]);
				let first = link.substr(0, 1);
				let isInner = first === '@';
				let content = MarkUp.parseLine(title, doc, 3, caches);
				const isFocused = (content + link).indexOf(MarkUp.FocusPlaceholder) >= 0;
				if (isFocused) {
					content = content.replace(MarkUp.FocusPlaceholder, '');
					link = link.replace(MarkUp.FocusPlaceholder, '');
					if (link.length === 0) return match;
					if (!!caches[title]) return match;
				}
				let key = 'link-' + MarkUp.generateRandomKey();
				let ui = '<a';
				if (isFocused) ui = ui + ' class="' + MarkUp.FocusClassName + '"';
				ui = ui + ' href="';
				if (isInner) {
					ui = ui + '#' + link.substr(1, link.length) + '">';
				}
				else if (link.indexOf('@') > 1 && !link.match(/^(ht|f)tps?:/i)) {
					ui = ui + 'mailto:' + link.replace(/^mailto:/i, '') + '">';
				}
				else if (first === '.' || first === '\\' || first === '/' || first === '#') {
					ui = ui + link + '">';
				}
				else {
					ui = ui + link + '" target="_blank">';
				}
				ui = ui + content + '</a>';
				caches[key] = ui;
				changed = true;
				return '%' + key + '%';
			}
			return match;
		});
		return [line, changed];
	},
}, 0, 3);
// 锚点与术语
MarkUp.addExtension({
	name: 'AnchorAndTerm',
	parse: (line, doc, caches) => {
		var changed = false;

		line = line.replace(/\[([\w %'"\-\.\+=,;:\?!\\\/&\u0800-\uffff]*?)\] *\{([\w \-\.]+?)\}/g, (match, title, name, pos) => {
			name = name.trim();
			title = title.trim();
			if (name.length === 0) return match;
			if (title.length === 0) return match;
			if (!!caches[title]) return match;

			var key;
			title = MarkUp.parseLine(title, doc, 3, caches);
			const isFocused = (title + name).indexOf(MarkUp.FocusPlaceholder) >= 0;
			if (isFocused) {
				title = title.replace(MarkUp.FocusPlaceholder, '');
				name = name.replace(MarkUp.FocusPlaceholder, '');
				if (name.length === 0) return match;
				if (title.length === 0) return match;
				if (!!caches[title]) return match;
			}

			if (!!doc.refs[name]) {
				// 有定义，所以是术语
				key = 'term-' + MarkUp.generateRandomKey();
				doc.termList = doc.termList || [];
				doc.termList.push([name, title]);
				doc.termList[name] = title;
				let ui = '<a class="';
				if (isFocused) ui = ui + MarkUp.FocusClassName + ' '
				ui = ui + 'terminology" name="' + name + '" href="#ref-' + name + '"><strong>' + title + '</strong></a>';
				caches[key] = ui;
			}
			else {
				// 无定义，所以只是一个锚点
				key = 'anchor-' + MarkUp.generateRandomKey();
				let ui = '<a';
				if (isFocused) ui = ui + ' class="' + MarkUp.FocusClassName + '"'
				ui = ui + ' name="' + name + '">' + title + '</a>';
				caches[key] = ui;
			}
			changed = true;
			return '%' + key + '%';
		});
		return [line, changed];
	},
}, 0, 3);

// Code
MarkUp.addExtension({
	name: 'Code',
	parse: (line, doc, caches) => {
		caches[MarkUp.SymHidden] = caches[MarkUp.SymHidden] || {};
		var changed = false;
		line = line.replace(/`([\w\W]+?)`/g, (match, content) => {
			if (match.indexOf('``') >= 0) return match;
			var key = 'code-' + MarkUp.generateRandomKey();
			caches[MarkUp.SymHidden][key] = '<code>' + content + '</code>';
			changed = true;
			return '%' + key + '%';
		});
		return [line, changed];
	},
});
// 粗体与斜体
MarkUp.addExtension({
	name: 'BoldAndItalic',
	parse: (line, doc, caches) => {
		var locs = [];
		line.replace(/\*+/g, (match, pos) => {
			locs.push([pos, match.length]);
		});
		if (locs.length < 2) return [line, false];

		var generate = (start, end, isBold) => {
			var part = line.substring(start, end + (isBold ? 2 : 1));
			var inner;
			if (isBold) inner = part.substring(2, part.length - 2);
			else inner = part.substring(1, part.length - 1);
			var key = (isBold ? 'strong' : 'em') + '-' + MarkUp.generateRandomKey();
			inner = MarkUp.parseLine(inner, doc, 5, caches);
			const isFocused = inner.indexOf(MarkUp.FocusPlaceholder) >= 0;
			if (isFocused) {
				inner = inner.replace(MarkUp.FocusPlaceholder, '');
				if (isBold) {
					caches[key] = '<strong class="' + MarkUp.FocusClassName + '">' + inner + '</strong>';
				}
				else {
					caches[key] = '<em class="' + MarkUp.FocusClassName + '">' + inner + '</em>';
				}
			}
			else {
				if (isBold) {
					caches[key] = '<strong>' + inner + '</strong>';
				}
				else {
					caches[key] = '<em>' + inner + '</em>';
				}
			}
			key = '%' + key + '%';
			line = line.replace(part, key);
		};

		var first = locs[0][1], second = locs[1][1];
		if (first < 3) {
			// 如果开头非联合
			if (first === second) {
				generate(locs[0][0], locs[1][0], first === 2);
				return [line, true];
			}
			else if (second < 3) {
				let third = locs[2];
				if (!third) {
					if (first > second) {
						generate(locs[0][0] + 1, locs[1][0], false);
						return [line, true];
					}
					else {
						generate(locs[0][0], locs[1][0], false);
						return [line, true];
					}
				} else {
					third = third[1];
					if (third < 3) {
						if (second === third) {
							generate(locs[1][0], locs[2][0], second === 2);
							return [line, true];
						}
						else if (first === third) {
							generate(locs[0][0], locs[2][0], first === 2);
							return [line, true];
						}
						else {
							return [line, false];
						}
					}
					else {
						generate(locs[1][0], locs[2][0], second === 2);
						return [line, true];
					}
				}
			}
			else {
				generate(locs[0][0], locs[1][0], first === 2);
				return [line, true];
			}
		} else {
			// 开头联合
			if (second < 3) {
				if (second === 1) {
					generate(locs[0][0] + first - 1, locs[1][0], false);
					return [line, true];
				} else {
					generate(locs[0][0] + first - 2, locs[1][0], true);
					return [line, true];
				}
			}
			else {
				generate(locs[0][0], locs[1][0] + second - 2, true);
				return [line, true];
			}
		}
		return [line, false];
	},
});
// 下标与下划线
MarkUp.addExtension({
	name: 'SubAndUnderline',
	parse: (line, doc, caches) => {
		var locs = [];
		line.replace(/_+/g, (match, pos) => {
			locs.push([pos, match.length]);
		});
		if (locs.length < 2) return [line, false];

		var generate = (start, end, isUnder) => {
			var part = line.substring(start, end + (isUnder ? 2 : 1));
			var inner;
			if (isUnder) inner = part.substring(2, part.length - 2);
			else inner = part.substring(1, part.length - 1);
			var key = (isUnder ? 'underline' : 'sub') + '-' + MarkUp.generateRandomKey();
			inner = MarkUp.parseLine(inner, doc, 5, caches);
			const isFocused = inner.indexOf(MarkUp.FocusPlaceholder) >= 0;
			if (isFocused) {
				inner = inner.replace(MarkUp.FocusPlaceholder, '');
				if (isUnder) {
					caches[key] = '<u class="' + MarkUp.FocusClassName + '">' + inner + '</u>';
				}
				else {
					caches[key] = '<sub class="' + MarkUp.FocusClassName + '">' + inner + '</sub>';
				}
			}
			else {
				if (isUnder) {
					caches[key] = '<u>' + inner + '</u>';
				}
				else {
					caches[key] = '<sub>' + inner + '</sub>';
				}
			}
			key = '%' + key + '%';
			line = line.replace(part, key);
		};

		var first = locs[0][1], second = locs[1][1], changed = false;
		if (first < 3) {
			// 如果开头非联合
			if (first === second) {
				generate(locs[0][0], locs[1][0], first === 2);
				changed = true;
			}
			else if (second < 3) {
				let third = locs[2];
				if (!third) {
					if (first > second) {
						generate(locs[0][0] + 1, locs[1][0], false);
						changed = true;
					}
					else {
						generate(locs[0][0], locs[1][0], false);
						changed = true;
					}
				}
				else {
					third = third[1];
					if (third < 3) {
						if (second === third) {
							generate(locs[1][0], locs[2][0], second === 2);
							changed = true;
						}
						else if (first === third) {
							generate(locs[0][0], locs[2][0], first === 2);
							changed = true;
						}
					}
					else {
						generate(locs[1][0], locs[2][0], second === 2);
						changed = true;
					}
				}
			}
			else {
				generate(locs[0][0], locs[1][0], first === 2);
				changed = true;
			}
		}
		else {
			// 开头联合
			if (second < 3) {
				if (second === 1) {
					generate(locs[0][0] + first - 1, locs[1][0], false);
					changed = true;
				}
				else {
					generate(locs[0][0] + first - 2, locs[1][0], true);
					changed = true;
				}
			}
			else {
				generate(locs[0][0], locs[1][0] + second - 2, true);
				changed = true;
			}
		}
		return [line, changed];
	},
});
// 波浪线与删除线
MarkUp.addExtension({
	name: 'WavyAndDelete',
	parse: (line, doc, caches) => {
		var locs = [];
		line.replace(/~+/g, (match, pos) => {
			locs.push([pos, match.length]);
		});
		if (locs.length < 2) return [line, false];

		var generate = (start, end, isDelete) => {
			var part = line.substring(start, end + (isDelete ? 2 : 1));
			var inner;
			if (isDelete) inner = part.substring(2, part.length - 2);
			else inner = part.substring(1, part.length - 1);
			var key = (isDelete ? 'delete' : 'wavy') + '-' + MarkUp.generateRandomKey();
			inner = MarkUp.parseLine(inner, doc, 5, caches);
			const isFocused = inner.indexOf(MarkUp.FocusPlaceholder) >= 0;
			if (isFocused) {
				inner = inner.replace(MarkUp.FocusPlaceholder, '');
				if (isDelete) {
					caches[key] = '<del class="' + MarkUp.FocusClassName + '">' + inner + '</del>';
				}
				else {
					caches[key] = '<span class="text-wavy ' + MarkUp.FocusClassName + '">' + inner + '</span>';
				}
			}
			else {
				if (isDelete) {
					caches[key] = '<del>' + inner + '</del>';
				}
				else {
					caches[key] = '<span class="text-wavy">' + inner + '</span>';
				}
			}
			key = '%' + key + '%';
			line = line.replace(part, key);
		};

		var first = locs[0][1], second = locs[1][1];
		if (first < 3) {
			// 如果开头非联合
			if (first === second) {
				generate(locs[0][0], locs[1][0], first === 2);
				return [line, true];
			}
			else if (second < 3) {
				let third = locs[2];
				if (!third) {
					if (first > second) {
						generate(locs[0][0] + 1, locs[1][0], false);
						return [line, true];
					}
					else {
						generate(locs[0][0], locs[1][0], false);
						return [line, true];
					}
				} else {
					third = third[1];
					if (third < 3) {
						if (second === third) {
							generate(locs[1][0], locs[2][0], second === 2);
							return [line, true];
						}
						else if (first === third) {
							generate(locs[0][0], locs[2][0], first === 2);
							return [line, true];
						}
						else {
							return [line, false];
						}
					}
					else {
						generate(locs[1][0], locs[2][0], second === 2);
						return [line, true];
					}
				}
			}
			else {
				generate(locs[0][0], locs[1][0], first === 2);
				return [line, true];
			}
		} else {
			// 开头联合
			if (second < 3) {
				if (second === 1) {
					generate(locs[0][0] + first - 1, locs[1][0], false);
					return [line, true];
				} else {
					generate(locs[0][0] + first - 2, locs[1][0], true);
					return [line, true];
				}
			}
			else {
				generate(locs[0][0], locs[1][0] + second - 2, true);
				return [line, true];
			}
		}
		return [line, false];
	},
});
// 上标与更大
MarkUp.addExtension({
	name: 'SupAndLarger',
	parse: (line, doc, caches) => {
		var generate = (start, end, level) => {
			var part = line.substring(start, end + level);
			var inner = part.substring(level, part.length - level);
			var key = 'larger-' + level + '-' + MarkUp.generateRandomKey();
			inner = MarkUp.parseLine(inner, doc, 5, caches);
			const isFocused = inner.indexOf(MarkUp.FocusPlaceholder) >= 0;
			if (isFocused) {
				inner = inner.replace(MarkUp.FocusPlaceholder, '');
				if (level <= 1) {
					caches[key] = '<sup class="' + MarkUp.FocusClassName + '">' + inner + '</sup>';
				}
				else {
					caches[key] = '<span class="text-larger level-' + (level - 1) + ' ' + MarkUp.FocusClassName + '">' + inner + '</span>';
				}
			}
			else {
				if (level <= 1) {
					caches[key] = '<sup>' + inner + '</sup>';
				}
				else {
					caches[key] = '<span class="text-larger level-' + (level - 1) + '">' + inner + '</span>';
				}
			}
			key = '%' + key + '%';
			line = line.replace(part, key);
		};

		var changed = false;
		line.replace(/(\^+)([\w\W]+?)(\^+)/, (match, pre, content, post, pos) => {
			var checker = content.match(/(\\*)\[/);
			if (!!checker) {
				let len = checker[1].length;
				if (len >> 1 << 1 === len) return match;
			}
			pre = pre.length;
			post = post.length;
			if (pre > post) {
				generate(pos + pre - post, pos + match.length - post, post);
			}
			else {
				generate(pos, pos + match.length - post, pre);
			}
			changed = true;
			return match;
		});
		return [line, changed];
	},
});

// 颜色
MarkUp.addExtension({
	name: 'Color',
	parse: (line, doc, caches) => {
		var changed = false;

		line = line.replace(/\[(\w+)\]([\w\W]+?)\[\/\]/, (match, color, content, pos) => {
			if (content.length === 0) return match;

			var key = 'color-' + MarkUp.generateRandomKey();
			content = MarkUp.parseLine(content, doc, 5, caches);
			const isFocused = content.indexOf(MarkUp.FocusPlaceholder) >= 0;
			if (isFocused) {
				content = content.replace(MarkUp.FocusPlaceholder, '');
				caches[key] = '<span class="color-' + color + ' ' + MarkUp.FocusClassName + '">' + content + '</span>';
			}
			else {
				caches[key] = '<span class="color-' + color + '">' + content + '</span>';
			}
			changed = true;
			return '%' + key + '%';
		});
		return [line, changed];
	},
}, 0, 6);
// 脚注与尾注
MarkUp.addExtension({
	name: 'FootnoteAndEndnote',
	parse: (line, doc, caches) => {
		var changed = false;

		line = line.replace(/(\[([\w %'"\-\.\+=,;:\?!\\\/&\u0800-\uffff]*?)\])?\[([\^:])([\w \-\.]+?)\]/g, (match, all, title='', prefix, name) => {
			name = name.trim();
			if (name.length === 0) return match;
			if (!doc.refs[name]) return match;

			var ui = '<a class="notemark" type="';
			if (prefix === '^') {
				ui += 'endnote" href="#endnote-' + name
			}
			else {
				ui += 'footnote'
			}
			ui += '" name="' + name + '">';
			if (title) {
				ui = ui + MarkUp.parseLine(title, doc, 6, caches);
			}
			ui += '<sup>'
			if (prefix === '^') { // 尾注
				doc.endnotes = doc.endnotes || [];
				let i = doc.endnotes.indexOf(name);
				if (i < 0) {
					i = doc.endnotes.length;
					doc.endnotes.push(name);
				}
				i ++;
				ui += '(' + i + ')';
			}
			else { // 脚注
				doc.footnotes = doc.footnotes || [];
				let i = doc.footnotes.indexOf(name);
				if (i < 0) {
					i = doc.footnotes.length;
					doc.footnotes.push(name);
				}
				ui += '[%%FN-' + i + '%%]';
			}
			ui += '</sup></a>';
			var key = 'notemark-' + MarkUp.generateRandomKey();
			caches[key] = ui;
			return '%' + key + '%'
		});
		return [line, changed];
	},
}, 0, 2);

// 图片等资源
MarkUp.addExtension({
	name: 'Images',
	parse: (line, doc, caches) => {
		var changed = false;

		line = line.replace(/([!@#])\[([^\n\r\[\]\(\)]*?(\[[^\n\r\[\]\(\)]*?\]|\([^\n\r\[\]\(\)]*?\))*?[^\n\r\[\]\(\)]*?)?\][ \t]*\(([^\n\r\[\]\(\)]*?(\[[^\n\r\[\]\(\)]*?\]|\([^\n\r\[\]\(\)]*?\))*?[^\n\r\[\]\(\)]*?)([ \t]('|")?(left|right|center)\7)?\)/g, (match, prev, title, tinner, link, linner, fcontainer, fmark, float, pos) => {
			title = !!title ? title.trim() : "";
			link = link.trim();
			if (link.match(/^%link\-\d+%$/)) {
				link = caches[link.substring(1, link.length - 1)];
				link = link.replace(/^<a href="|"( target="_blank")?>[\w\W]*?<\/a>$/gi, '');
			}
			if (link.length === 0) return match;

			var type = 'image';
			if (prev === '@') type = 'video';
			else if (prev === '#') type = 'audio';
			title = MarkUp.parseLine(title, doc, 3, caches);
			const isFocused = (title + link).indexOf(MarkUp.FocusPlaceholder) >= 0;
			if (isFocused) {
				title = title.replace(MarkUp.FocusPlaceholder, '');
				link = link.replace(MarkUp.FocusPlaceholder, '');
				if (link.length === 0) return match;
			}
			doc[type] = doc[type] || [];
			doc[type].push([title, link]);

			var content = '<div class="resource ' + type + (isFocused ? ' ' + MarkUp.FocusClassName : '');
			if (!!float) {
				content += ' float-' + float;
			}
			content += '">';
			content += '<figure>';
			if (prev === '!') {
				content += '<img src="' + link + '">';
			}
			else if (prev === '@') {
				content += '<video src="' + link + '" controls>你的浏览器不支持 <code>video</code> 标签.</video>';
			}
			else if (prev === '#') {
				content += '<audio src="' + link + '" controls>你的浏览器不支持 <code>audio</code> 标签.</audio>';
			}
			content += '</figure>';
			content += '<figcaption>' + title + '</figcaption>';
			content += '</div>';

			var key = type + '-' + MarkUp.generateRandomKey();
			caches[key] = content;
			changed = true;
			return '%' + key + '%';
		});
		return [line, changed];
	},
}, 0, 7);

// URL 格式解析
MarkUp.addExtension({
	name: 'InlineLinks',
	parse: (line, doc, caches) => {
		var changed = false;
		if (!doc.mainParser) return [line, changed];

		// 网络 URL
		line = line.replace(/(['"`]?)((http|ftp|file)s?:\/\/[\w\-\+=\.,:;#\?&\|\\\/%]+|mailto:([^?#]*)(?:[?#].*)?)\1/gi, (match, braket, url, protocol, pos) => {
			let key;
			changed = true;
			key = 'link-' + MarkUp.generateRandomKey();
			if (!!braket && protocol !== 'file') {
				match = match.replace(MarkUp.FocusPlaceholder, '<span class="' + MarkUp.FocusClassName + '"></span>');
				caches[key] = match;
			}
			else {
				const isFocused = url.indexOf(MarkUp.FocusPlaceholder) >= 0;
				if (isFocused) url = url.replace(MarkUp.FocusPlaceholder, '');
				doc.links.push([url, url]);
				let ui = '<a ';
				if (isFocused) ui = ui + 'class="' + MarkUp.FocusClassName + '" ';
				ui = ui + 'href="' + url + '" target="_blank">' + url.replace(/^mailto:/i, '') + '</a>';
				caches[key] = ui;
			}
			return '%' + key + '%';
		});

		// 本地文件路径
		line = line.replace(/([\s`])((?:\.\/|\/|\w:\/\/)[^\s`]+\.\w+)\1/gi, (match, braket, url, pos) => {
			let key;
			changed = true;
			key = 'link-' + MarkUp.generateRandomKey();
			const isFocused = url.indexOf(MarkUp.FocusPlaceholder) >= 0;
			if (isFocused) url = url.replace(MarkUp.FocusPlaceholder, '');
			doc.links.push([url, url]);
			let ui = ' <a ';
			if (isFocused) ui = ui + 'class="' + MarkUp.FocusClassName + '" ';
			ui = ui + 'href="file://' + url + '" target="_blank">' + url.replace(/^mailto:/i, '') + '</a> ';
			caches[key] = ui;
			return '%' + key + '%';
		});

		// 本地目录路径
		line = line.replace(/([\s`])((?:\.\/|\/|\w:\/\/)[^\s`]+\/)\1/gi, (match, braket, url, pos) => {
			let key;
			changed = true;
			key = 'link-' + MarkUp.generateRandomKey();
			const isFocused = url.indexOf(MarkUp.FocusPlaceholder) >= 0;
			if (isFocused) url = url.replace(MarkUp.FocusPlaceholder, '');
			doc.links.push([url, url]);
			let ui = ' <a ';
			if (isFocused) ui = ui + 'class="' + MarkUp.FocusClassName + '" ';
			ui = ui + 'href="file://' + url + '" target="_blank">' + url.replace(/^mailto:/i, '') + '</a> ';
			caches[key] = ui;
			return '%' + key + '%';
		});

		return [line, changed];
	},
}, 0, 4);

// 快速图标
MarkUp.addExtension({
	name: 'QuickIcon',
	parse: (line, doc, caches) => {
		var changed = false;

		line = line.replace(/(<*)(\-\-+|==+)(>*)/g, (match, pre, inner, post, pos) => {
			if (pre.length + post.length !== 1) return match;
			if (inner.length !== 2) return match;
			let name = '-long.svg';
			if (!!pre) name = 'left' + name;
			else name = 'right' + name;
			if (inner === '--') name = 'arrow-' + name;
			name = '<img class="fontawesome" src="../images/' + name + '">';
			changed = true;
			const key = 'quickicon-' + MarkUp.generateRandomKey();
			caches[key] = name;
			return '%' + key + '%';
		});
		return [line, changed];
	},
}, 0, 10);

// 定位当前光标所在段落
MarkUp.addExtension({
	name: 'FocusCurrent',
	parse: (text, doc) => {
		var focus = text.indexOf(MarkUp.FocusPlaceholder);
		if (focus >= 0) {
			let pre = text.substring(0, focus), tagContent, tagName, tagStart, tagEnd;
			pre.replace(MarkUp.RegContainerHTMLTag, (ctx, tag, pos) => {
				tagContent = ctx;
				tagName = tag;
				tagStart = pos;
				tagEnd = pos + ctx.length;
			});
			if (!!tagContent) {
				pre = text.substring(0, tagStart);
				let post = text.substring(tagEnd);
				let clsMatch = tagContent.match(/\s+class=['"]/i);
				if (!clsMatch) {
					tagContent = tagContent.replace('<' + tagName, '<' + tagName + ' class="' + MarkUp.FocusClassName + '"');
				}
				else {
					let p = clsMatch.index + clsMatch[0].length;
					let bra = tagContent.substring(0, p);
					let ket = tagContent.substring(p);
					tagContent = bra + MarkUp.FocusClassName + ' ' + ket;
				}
				text = pre + tagContent + post;
			}
			text = text.replace(MarkUp.FocusPlaceholder, '');
		}
		return text;
	},
}, 2, -1);
MarkUp.insertFocusAtPosition = (content, pos) => {
	let pre = content.substring(0, pos);
	let post = content.substring(pos);
	if (pre.match(/[\n\r]$/)) {
		const match = post.match(/[^\n\r]/);
		if (!match) {
			const idx = pre.lastIndexOf('\n');
			if (idx >= 0) pos = idx + 1;
		}
		else {
			pos += match.index;
		}
		pre = content.substring(0, pos);
		post = content.substring(pos);

		let bra = pre.match(/(\p{L}|\p{N})[^\p{L}\p{N}]*?$/ug);
		let ket = post.match(/^[^\p{L}\p{N}]*?(\p{L}|\p{N})/ug);
		if (!!bra || !!ket) {
			if (!bra) {
				ket = ket[0].length - 1;
				pos += ket;
			}
			else if (!ket) {
				bra = bra[0].length - 1;
				pos -= bra;
			}
			else {
				bra = bra[0].length - 1;
				ket = ket[0].length - 1;
				if (ket < bra) {
					pos += ket;
				}
				else {
					pos -= bra;
				}
			}
			pre = content.substring(0, pos);
			post = content.substring(pos);
		}
	}
	return pre + MarkUp.FocusPlaceholder + post;
};

// 悬停显示脚注尾注
MarkUp.InitNotes = UI => {
	const NoteFrame = document.querySelector('#footnoteFrame');
	if (!NoteFrame) return;
	NoteFrame._status = 0;

	const foundNotemark = ele => {
		while (true) {
			if (ele.classList.contains('notemark') || ele.classList.contains('terminology')) return ele;
			ele = ele.parentElement;
			if (!ele || ele === document.body || ele === UI) return null;
		}
	};
	
	UI.addEventListener('mouseover', async ({target}) => {
		const ele = foundNotemark(target);
		if (!ele) return;

		var name = ele.getAttribute('href');
		if (name.substr(0, 1) !== '#') return;
		name = name.substring(1);
		const info = UI.querySelector('a[name="' + name + '"]');
		if (!info) return;

		const content = info.parentElement.innerHTML.replace(info.outerHTML, '');
		var html = '';

		if (ele.classList.contains('terminology')) {
			html = '<p class="note-title">' + ele.innerText + '</p>';
		}
		html += '<p class="note-content">' + content + '</p>';
		NoteFrame.innerHTML = html;
		NoteFrame._status = 1;

		var rect = ele.getBoundingClientRect();
		var isTop = true, isLeft = true;
		var left = rect.left - 10;
		var top = rect.top + rect.height + 10;
		if (left > window.innerWidth * 0.6) {
			isLeft = false;
			left = window.innerWidth - rect.right;
		}
		if (top > window.innerHeight * 0.7) {
			isTop = false;
			top = window.innerHeight - rect.top;
		}

		if (isLeft) {
			NoteFrame.style.left = left + 'px';
			NoteFrame.style.right = '';
		}
		else {
			NoteFrame.style.left = '';
			NoteFrame.style.right = left + 'px';
		}
		if (isTop) {
			NoteFrame.style.top = top + 'px';
			NoteFrame.style.bottom = '';
		}
		else {
			NoteFrame.style.top = '';
			NoteFrame.style.bottom = top + 'px';
		}
		NoteFrame.style.display = 'block';
		await wait(50);
		NoteFrame.style.opacity = '1';
		NoteFrame._status = 2;
	});
	UI.addEventListener('mouseout', async ({target}) => {
		const ele = foundNotemark(target);
		if (!ele) return;

		NoteFrame.style.opacity = '0';
		await wait(200);
		if (NoteFrame._status === 2) {
			NoteFrame.style.display = 'none';
			NoteFrame._status = 0;
		}
	});
};

// Threads Management
if (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
	self.onmessage = evt => {
		const FONTAWESOMEROOT = "https://site-assets.fontawesome.com/releases/v5.15.4/svgs/";
		let content = evt.data.data;

		// SVG
		let blocks = {}, blockCount = 0;
		content = content.replace(/<\?xml[^>]*?>/gi, '');
		content = content.replace(/<(svg)([^>]*?)?>[\w\W]*?<\/\1>/gi, (m) => {
			blockCount ++;
			let tagName = 'BLOCK::' + blockCount;
			blocks[tagName] = m;
			return '[' + tagName + ']';
		});

		// Parse FontAwesome
		content = content.replace(/:fa([rsb])\.([\w\-]+):/gi, (m, type, icon) => {
			type = (type || '').toLowerCase();
			if (type === 'r') {
				type = 'regular';
			}
			else if (type === 's') {
				type = 'solid';
			}
			else {
				type = 'brands';
			}
			const url = FONTAWESOMEROOT + type + '/' + icon + '.svg';
			return '<img class="fontawesome" src="' + url + '">'
		});
		content = content.replace(/\bfa([rsb])::([\w\-]+)\b/gi, (m, type, icon) => {
			type = (type || '').toLowerCase();
			if (type === 'r') {
				type = 'regular';
			}
			else if (type === 's') {
				type = 'solid';
			}
			else {
				type = 'brands';
			}
			const url = FONTAWESOMEROOT + type + '/' + icon + '.svg';
			return '<img class="fontawesome" src="' + url + '">'
		});
		content = content.replace(/<i class=('|")fa([rsb])( fa\-([\w\-]+))+\1\s*(><\/i>|\/>)/gi, (m, _, type) => {
			var icon = '';
			var icons = m.match(/fa-([\w\-]+)/gi);
			icons.forEach(item => {
				item = item.replace(/^fa\-/i, '');
				if (!item) return;
				if (['solid', 'regular', 'brands'].includes(item.toLowerCase())) return;
				if (item.length > icon.length) icon = item;
			});
			if (!icon) return m;

			type = (type || '').toLowerCase();
			if (type === 'r') {
				type = 'regular';
			}
			else if (type === 's') {
				type = 'solid';
			}
			else {
				type = 'brands';
			}
			const url = FONTAWESOMEROOT + type + '/' + icon + '.svg';
			return '<img class="fontawesome" src="' + url + '">'
		});
		content = content.replace(/<i class=('|")fa-(solid|regular|brands)( fa-([\w\-]+))+\1\s*(><\/i>|\/>)/gi, (m, _, type, icons) => {
			var icon = '';
			var icons = m.match(/fa-([\w\-]+)/gi);
			icons.forEach(item => {
				item = item.replace(/^fa\-/i, '');
				if (!item) return;
				if (['solid', 'regular', 'brands'].includes(item.toLowerCase())) return;
				if (item.length > icon.length) icon = item;
			});
			if (!icon) return m;

			type = (type || '').toLowerCase();
			const url = FONTAWESOMEROOT + type + '/' + icon + '.svg';
			return '<img class="fontawesome" src="' + url + '">'
		});

		// Parse Markdown
		content = MarkUp.parse(content, {
			toc: false,
			glossary: true,
			resources: false,
			showauthor: false,
			showtitle: false,
			singleSection: true,
			classname: 'markup-content',
		}) || '';

		let last = content;
		while (true) {
			last = content.replace(/\[BLOCK::\d+\]/g, (m) => {
				let key = m.replace(/\[|\]/g, '');
				return blocks[key] || m;
			});
			if (content === last) break;
			content = last;
		}

		self.postMessage({result: content});
	};
}