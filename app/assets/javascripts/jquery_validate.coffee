$.validator.setDefaults
  errorClass: 'eui-banner--danger'
  errorElement: 'div'
  onkeyup: false

  errorPlacement: (error, element) ->
    error.insertAfter(element)

  onfocusout: (error) ->
    this.element(error)

  highlight: (element, errorClass) ->
    # Prevent highlighting the fields themselves
    return false
