import React from 'react'
import { Form as AntForm, Checkbox as AntCheckbox, Radio as AntRadio, Switch as AntSwitch, DatePicker as AntDatePicker } from 'antd'
import type { FormProps as AntFormProps, CheckboxProps, RadioProps, SwitchProps, DatePickerProps } from 'antd'

// Form exports
export const Form = AntForm
export const FormItem = AntForm.Item
export const useForm = AntForm.useForm

// Form component wrappers
export function Checkbox(props: CheckboxProps) {
  return <AntCheckbox {...props} />
}

export function Radio(props: RadioProps) {
  return <AntRadio {...props} />
}

export const RadioGroup = AntRadio.Group

export function Switch(props: SwitchProps) {
  return <AntSwitch {...props} />
}

export function DatePicker(props: DatePickerProps) {
  return <AntDatePicker {...props} />
}

export const RangePicker = AntDatePicker.RangePicker