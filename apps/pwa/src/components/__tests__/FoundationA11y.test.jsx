import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { describe, expect, test } from 'vitest'
import Button from '@/components/Button'
import Card from '@/components/Card'
import Input from '@/components/Input'
import Select from '@/components/Select'
import SkeletonCard from '@/shared/ui/SkeletonCard'

expect.extend(toHaveNoViolations)

describe('Foundation accessibility', () => {
  test('shared primitives have no critical axe violations', async () => {
    const { container } = render(
      <div>
        <Button>Valider</Button>
        <Card hover className="mt-4">
          <p>Contenu carte</p>
        </Card>
        <div className="mt-4">
          <Input label="Email" name="email" placeholder="email@docling.app" />
        </div>
        <div className="mt-4">
          <Select label="Type" name="type" options={[{ value: 'a', label: 'Option A' }]} />
        </div>
        <div className="mt-4">
          <SkeletonCard count={1} />
        </div>
      </div>
    )

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
