import { Validator } from 'vee-validate'

Validator.extend('bytecode', {
  getMessage: (field: string) => {
    return `${field} field is invalid.`
  },
  validate: (value: string) => {
    const regex = /^(0x|0X)[a-fA-F0-9]+$/
    return regex.test(value) && value.length % 2 === 0
  }
})

Validator.extend('vet', {
  getMessage: (field: string) => {
    return `${field} field is invalid, (positive number and limited to 18 decimal places).`
  },
  validate: (value: string) => {
    const v = BN(value)
    const temp = BN(v.multipliedBy(1e18))
    return temp.isInteger() && !temp.isNegative()
  }
})
const dictionary = {
  en: {
    attributes: {
      code: `Byte Code`
    }
  }
}

Validator.localize(dictionary)
