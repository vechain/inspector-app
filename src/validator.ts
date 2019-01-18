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
const dictionary = {
  en: {
    attributes: {
      code: `Byte Code`
    }
  }
}

Validator.localize(dictionary)
