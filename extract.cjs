const ts = require('typescript')
const fs = require('fs')

const program = ts.createProgram({ rootNames: [require.resolve('typescript/lib/lib.dom.d.ts')], options: {} })

const file = program.getSourceFile(require.resolve('typescript/lib/lib.dom.d.ts'))
const elements = []

ts.forEachChild(file, node => {
  if (node.name?.escapedText === 'HTMLElementTagNameMap')
  node.members.forEach((member) => {
    const tag = member.name.text
    elements.push(`  ${tag}: elementWrapper('${tag}'),`)
  })
})

fs.writeFileSync('src/methods/elements.ts', `import { tree, elementWrapper } from '../helpers/element'

const elements = {
${elements.join('\n')}
}

const subtree: typeof tree & typeof elements = Object.assign(tree, elements)

export { subtree as tree }
`)
